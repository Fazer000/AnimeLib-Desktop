import { animeApi } from '../../api/animeApi';
import {
  FRANCHISE_CONCURRENCY,
  FRANCHISE_MAX_HOPS,
  FRANCHISE_MAX_TITLES,
  FRANCHISE_REQUEST_GAP_MS,
} from '../../../constants';
import PriorityTaskQueue from '../../utils/PriorityTaskQueue';
import {
  FranchiseEdge,
  FranchiseGraph,
  FranchiseTitle,
  animeRelationEdges,
  dedupeRelations,
  isFranchiseLink,
  isSequelLabel,
  mergeEdges,
  titleFromRelation,
} from '../../utils/franchiseGraph';
import { createLogger } from '../../../shared/logger';

const log = createLogger('franchiseLoader');

export interface FranchiseProgress {
  loaded: number;
  found: number;
}

/**
 * Состояние обхода: граф из уже загруженных тайтлов растёт по ходу
 */
export interface FranchiseState {
  graph: FranchiseGraph | null;
  progress: FranchiseProgress | null;
  done: boolean;
  failed: boolean;
}

type Listener = (state: FranchiseState) => void;

interface Crawl {
  state: FranchiseState;
  listeners: Set<Listener>;
}

const crawls = new Map<string, Crawl>();

/**
 * Обходит связи от тайтла и дозапрашивает даты выхода: в ответе связей их нет.
 * Даты найденных тайтлов идут раньше связей, чтобы узлы появлялись быстрее.
 * После каждого ответа отдаёт граф из тайтлов, для которых пришли данные
 */
async function crawlFranchise(
  startSlug: string,
  onUpdate: (graph: FranchiseGraph, progress: FranchiseProgress) => void,
): Promise<FranchiseGraph> {
  const queue = new PriorityTaskQueue(
    FRANCHISE_CONCURRENCY,
    FRANCHISE_REQUEST_GAP_MS,
  );
  const titles = new Map<string, FranchiseTitle>();
  const ready = new Set<string>();
  const edges: FranchiseEdge[] = [];
  const pending: Promise<void>[] = [];
  const hops = new Map<string, number>([[startSlug, 0]]);
  const expanded = new Set<string>();

  const snapshot = (): FranchiseGraph => ({
    titles: new Map([...titles].filter(([slug]) => ready.has(slug))),
    edges: mergeEdges(
      edges.filter((edge) => ready.has(edge.from) && ready.has(edge.to)),
    ),
  });

  const report = () =>
    onUpdate(snapshot(), { loaded: ready.size, found: titles.size });

  const loadDetails = async (slugUrl: string): Promise<void> => {
    try {
      const info = await queue.run(
        () => animeApi.getAnimeRelease(slugUrl),
        'high',
      );
      const known = titles.get(slugUrl);

      titles.set(slugUrl, {
        slugUrl,
        name: info.rus_name || info.name || known?.name || slugUrl,
        type: info.type?.label || known?.type || '',
        cover:
          info.cover?.thumbnail || info.cover?.default || known?.cover || null,
        releaseDate: info.releaseDate || null,
      });
    } catch (error) {
      log.warn('Release date failed:', slugUrl, error);
    }

    ready.add(slugUrl);
    report();
  };

  const loadRelations = async (slugUrl: string): Promise<void> => {
    try {
      const relations = await queue.run(
        () => animeApi.getRelatedAnime(slugUrl),
        'low',
      );
      const anime = dedupeRelations(relations.data).filter(
        (item) => item.media.model === 'anime',
      );

      edges.push(...animeRelationEdges(slugUrl, anime));

      const parentHops = hops.get(slugUrl) ?? 0;

      anime.forEach((item) => {
        const next = item.media.slug_url;
        const { label } = item.related_type;
        const hop = parentHops + (isSequelLabel(label) ? 0 : 1);
        const known = titles.has(next);

        if (hop > FRANCHISE_MAX_HOPS + 1) return;
        if (!known && titles.size >= FRANCHISE_MAX_TITLES) return;
        if (known && hop >= (hops.get(next) ?? Infinity)) return;

        hops.set(next, hop);

        if (!known) {
          titles.set(next, titleFromRelation(item.media));
          pending.push(loadDetails(next));
        }

        if (
          isFranchiseLink(label) &&
          hop <= FRANCHISE_MAX_HOPS &&
          !expanded.has(next)
        ) {
          expanded.add(next);
          pending.push(loadRelations(next));
        }
      });

      report();
    } catch (error) {
      log.warn('Relations failed:', slugUrl, error);
    }
  };

  titles.set(startSlug, {
    slugUrl: startSlug,
    name: startSlug,
    type: '',
    cover: null,
    releaseDate: null,
  });
  expanded.add(startSlug);
  pending.push(loadDetails(startSlug), loadRelations(startSlug));
  report();

  for (let index = 0; index < pending.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await pending[index];
  }

  const graph = snapshot();
  log.debug(
    `Franchise of ${startSlug}: ${graph.titles.size} titles, ${graph.edges.length} links`,
  );
  return graph;
}

const notify = (crawl: Crawl, state: FranchiseState) => {
  crawl.state = state;
  crawl.listeners.forEach((listener) => listener(state));
};

/**
 * Запускает обход франшизы. Готовый граф запоминается на сессию для всех
 * его тайтлов, поэтому переход внутри франшизы не повторяет обход
 */
function startCrawl(slugUrl: string): Crawl {
  const crawl: Crawl = {
    state: { graph: null, progress: null, done: false, failed: false },
    listeners: new Set(),
  };
  crawls.set(slugUrl, crawl);

  crawlFranchise(slugUrl, (graph, progress) =>
    notify(crawl, { graph, progress, done: false, failed: false }),
  )
    .then((graph) => {
      notify(crawl, { graph, progress: null, done: true, failed: false });
      graph.titles.forEach((_, slug) => crawls.set(slug, crawl));
      return graph;
    })
    .catch((error) => {
      log.error('Franchise failed:', slugUrl, error);
      crawls.delete(slugUrl);
      notify(crawl, { ...crawl.state, done: true, failed: true });
    });

  return crawl;
}

/**
 * Подписка на граф франшизы тайтла: слушатель сразу получает текущее
 * состояние и дальше — каждое обновление. Возвращает отписку
 */
export function subscribeFranchise(
  slugUrl: string,
  listener: Listener,
): () => void {
  const crawl = crawls.get(slugUrl) ?? startCrawl(slugUrl);

  crawl.listeners.add(listener);
  listener(crawl.state);

  return () => {
    crawl.listeners.delete(listener);
  };
}

/**
 * Обход франшизы тайтла уже идёт или закончен
 */
export function hasFranchiseCrawl(slugUrl: string): boolean {
  return crawls.has(slugUrl);
}
