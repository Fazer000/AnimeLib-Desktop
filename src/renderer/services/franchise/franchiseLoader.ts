import { animeApi } from '../../api/animeApi';
import {
  FRANCHISE_CONCURRENCY,
  FRANCHISE_MAX_HOPS,
  FRANCHISE_MAX_TITLES,
  FRANCHISE_REQUEST_GAP_MS,
  FRANCHISE_SEARCH_CANDIDATES,
  FRANCHISE_CACHE_SAVE_DELAY_MS,
  FRANCHISE_FOUND_TTL_MS,
  FRANCHISE_MISSING_TTL_MS,
} from '../../../constants';
import PriorityTaskQueue, { TaskPriority } from '../../utils/PriorityTaskQueue';
import { shikimoriApi } from '../../api/shikimoriApi';
import {
  AnimelibMatch,
  ShikimoriFranchise,
  animelibSlugFromShikimoriUrl,
  markGuestMiss,
  matchOrder,
  shikimoriKey,
  toAnimelibMatch,
} from '../../utils/shikimoriFranchise';
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
import { freshMatches, toCachedFranchise } from '../../utils/franchiseCache';
import { loadCachedFranchise, saveCachedFranchise } from './franchiseStore';
import { createLogger } from '../../../shared/logger';

const log = createLogger('franchiseLoader');

export interface FranchiseProgress {
  loaded: number;
  found: number;
}

/**
 * Состояние обхода: граф из уже загруженных тайтлов растёт по ходу
 */
/** Франшиза из Shikimori и найденные на Animelib тайтлы */
export interface ShikimoriSource {
  franchise: ShikimoriFranchise;
  matches: Map<number, AnimelibMatch>;
}

export interface FranchiseState {
  graph: FranchiseGraph | null;
  shikimori: ShikimoriSource | null;
  progress: FranchiseProgress | null;
  done: boolean;
  failed: boolean;
}

type Listener = (state: FranchiseState) => void;

interface Crawl {
  state: FranchiseState;
  listeners: Set<Listener>;
  match?: (
    shikimoriId: number,
    priority: TaskPriority,
  ) => Promise<AnimelibMatch>;
  recheck?: () => void;
}

const EMPTY_STATE: FranchiseState = {
  graph: null,
  shikimori: null,
  progress: null,
  done: false,
  failed: false,
};

const crawls = new Map<string, Crawl>();

/**
 * Во франшизе Shikimori нет других тайтлов
 */
class EmptyFranchiseError extends Error {
  constructor() {
    super('Shikimori franchise is empty');
  }
}

/** Обходит связи от тайтла и дозапрашивает даты выхода: в ответе связей их нет */
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

/** Запускает обход франшизы */
function startCrawl(slugUrl: string): Crawl {
  const crawl: Crawl = { state: EMPTY_STATE, listeners: new Set() };
  crawls.set(slugUrl, crawl);

  crawlFranchise(slugUrl, (graph, progress) =>
    notify(crawl, { ...EMPTY_STATE, graph, progress }),
  )
    .then((graph) => {
      notify(crawl, { ...EMPTY_STATE, graph, done: true });
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

/** Франшиза из Shikimori с поиском тайтлов на Animelib */
function startShikimoriCrawl(slugUrl: string, shikimoriId: number): Crawl {
  const crawl: Crawl = { state: EMPTY_STATE, listeners: new Set() };
  const queue = new PriorityTaskQueue(
    FRANCHISE_CONCURRENCY,
    FRANCHISE_REQUEST_GAP_MS,
  );
  const inFlight = new Map<number, Promise<AnimelibMatch>>();
  let source: ShikimoriSource | null = null;
  let saved = loadCachedFranchise(shikimoriId);
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  crawls.set(shikimoriKey(shikimoriId), crawl);

  const applyFranchise = (
    franchise: ShikimoriFranchise,
    matches: Map<number, AnimelibMatch>,
  ) => {
    source = { franchise, matches };
    franchise.nodes.forEach((node) => crawls.set(shikimoriKey(node.id), crawl));
  };

  const persist = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!source) return;
      saved = toCachedFranchise(
        source.franchise,
        source.matches,
        saved,
        Date.now(),
      );
      saveCachedFranchise(saved);
    }, FRANCHISE_CACHE_SAVE_DELAY_MS);
  };

  if (saved) {
    applyFranchise(
      saved.franchise,
      freshMatches(saved, Date.now(), {
        found: FRANCHISE_FOUND_TTL_MS,
        missing: FRANCHISE_MISSING_TTL_MS,
      }),
    );
  }

  const report = (done: boolean) => {
    if (!source) return;
    notify(crawl, {
      ...EMPTY_STATE,
      shikimori: source,
      progress: {
        loaded: source.matches.size,
        found: matchOrder(source.franchise, shikimoriId).length,
      },
      done,
    });
  };

  crawl.match = (id, priority) => {
    const known = source?.matches.get(id);
    if (known) return Promise.resolve(known);

    const running = inFlight.get(id);
    if (running) return running;

    const node = source?.franchise.nodes.find((item) => item.id === id);
    const lookup = node ? animelibSlugFromShikimoriUrl(node.url) : null;

    const task = (async () => {
      const found = lookup
        ? await queue.run(() => animeApi.findAnime(lookup), priority)
        : null;
      let result = toAnimelibMatch(found, id);

      if (!result.slug && node) {
        const search = await queue.run(
          () => animeApi.searchAnime(node.name),
          priority,
        );
        const candidates = search.data
          .map((item) => item.slug_url)
          .filter((slug) => slug !== found?.slug_url)
          .slice(0, FRANCHISE_SEARCH_CANDIDATES);

        for (
          let index = 0;
          index < candidates.length && !result.slug;
          index += 1
        ) {
          // eslint-disable-next-line no-await-in-loop
          const candidate = await queue.run(
            () => animeApi.findAnime(candidates[index]),
            priority,
          );
          result = toAnimelibMatch(candidate, id);
        }
      }

      result = markGuestMiss(result, animeApi.isAuthorized());

      if (source) {
        source = {
          ...source,
          matches: new Map(source.matches).set(id, result),
        };
        report(false);
        persist();
      }
      return result;
    })().finally(() => inFlight.delete(id));

    inFlight.set(id, task);
    return task;
  };

  crawl.recheck = () => {
    if (!source || !animeApi.isAuthorized()) return;

    const hidden = [...source.matches]
      .filter(([, match]) => match.restricted)
      .map(([id]) => id);
    if (hidden.length === 0) return;

    const matches = new Map(source.matches);
    hidden.forEach((id) => matches.delete(id));
    source = { ...source, matches };
    report(false);

    Promise.all(
      hidden.map((id) => crawl.match?.(id, 'low').catch(() => undefined)),
    )
      .then(() => report(true))
      .catch(() => undefined);
  };

  const refresh = async () => {
    const franchise = await shikimoriApi.getFranchise(shikimoriId);

    if (matchOrder(franchise, shikimoriId).length === 0) {
      throw new EmptyFranchiseError();
    }

    const ids = new Set(franchise.nodes.map((node) => node.id));
    const kept = new Map(
      [...(source?.matches ?? new Map<number, AnimelibMatch>())].filter(
        ([id]) => ids.has(id),
      ),
    );
    applyFranchise(franchise, kept);
    persist();
  };

  const run = async () => {
    report(false);

    try {
      await refresh();
    } catch (error) {
      if (!source) throw error;
      log.warn('Shikimori unavailable, using saved franchise:', error);
    }

    if (!source) return;
    const { franchise } = source;
    report(false);

    const order = matchOrder(franchise, shikimoriId);
    for (let index = 0; index < order.length; index += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await crawl.match?.(order[index].id, 'low');
      } catch (error) {
        log.warn('Animelib lookup failed:', order[index].url, error);
      }
    }

    report(true);
    log.debug(
      `Shikimori franchise ${shikimoriId}: ${franchise.nodes.length} titles`,
    );
  };

  run().catch((error) => {
    if (source) {
      report(true);
      return;
    }

    if (error instanceof EmptyFranchiseError) {
      log.debug('No Shikimori franchise, crawling Animelib:', shikimoriId);
    } else {
      log.warn('Shikimori unavailable, crawling Animelib:', error);
    }
    const fallback = crawls.get(slugUrl) ?? startCrawl(slugUrl);
    fallback.listeners.add((state) => notify(crawl, state));
    notify(crawl, fallback.state);
  });

  return crawl;
}

/** Подписка на граф франшизы тайтла; возвращает отписку */
export function subscribeFranchise(
  slugUrl: string,
  shikimoriId: number | null,
  listener: Listener,
): () => void {
  const crawl =
    shikimoriId === null
      ? (crawls.get(slugUrl) ?? startCrawl(slugUrl))
      : (crawls.get(shikimoriKey(shikimoriId)) ??
        startShikimoriCrawl(slugUrl, shikimoriId));

  crawl.recheck?.();
  crawl.listeners.add(listener);
  listener(crawl.state);

  return () => {
    crawl.listeners.delete(listener);
  };
}

/** Состояние уже загружаемой франшизы без подписки; null — не загружалась */
export function peekFranchise(
  slugUrl: string,
  shikimoriId: number | null,
): FranchiseState | null {
  const key = shikimoriId === null ? slugUrl : shikimoriKey(shikimoriId);
  return crawls.get(key)?.state ?? null;
}

/**
 * Обход франшизы тайтла уже идёт или закончен
 */
export function hasFranchiseCrawl(
  slugUrl: string,
  shikimoriId: number | null,
): boolean {
  return crawls.has(shikimoriId === null ? slugUrl : shikimoriKey(shikimoriId));
}

/** Ищет тайтл Shikimori на Animelib вне очереди — когда по нему кликнули */
export async function resolveFranchiseTitle(
  shikimoriId: number,
): Promise<string | null> {
  const crawl = crawls.get(shikimoriKey(shikimoriId));
  if (!crawl?.match) return null;

  const result = await crawl.match(shikimoriId, 'high');
  return result.slug;
}
