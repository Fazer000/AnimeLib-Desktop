/** Франшиза из Shikimori: разбор ответа в граф хронологии и сопоставление тайтлов с Animelib */
import {
  FranchiseEdge,
  FranchiseGraph,
  FranchiseTitle,
  mergeEdges,
  normalizeEdge,
} from './franchiseGraph';

export interface ShikimoriFranchiseNode {
  id: number;
  date: number | null;
  name: string;
  image_url: string | null;
  url: string;
  year: number | null;
  kind: string;
}

export interface ShikimoriFranchiseLink {
  source_id: number;
  target_id: number;
  relation: string;
}

export interface ShikimoriFranchise {
  current_id: number;
  nodes: ShikimoriFranchiseNode[];
  links: ShikimoriFranchiseLink[];
}

/** Результат поиска тайтла Shikimori на Animelib */
export interface AnimelibMatch {
  slug: string | null;
  cover: string | null;
  restricted?: boolean;
}

/**
 * Текущий тайтл: его id на Shikimori и slug на Animelib
 */
export interface FranchiseCurrent {
  id: number;
  slug: string;
}

/** Реклама и проморолики в хронологию не входят */
const EXCLUDED_KINDS = new Set(['Реклама', 'Проморолик', 'cm', 'pv']);

/** Часовой пояс дат Shikimori: полночь по Москве, с */
const SHIKIMORI_DATE_OFFSET = 3 * 60 * 60;

/** Связь Shikimori в связь графа */
const RELATIONS: Record<string, { label: string; reverse?: boolean }> = {
  sequel: { label: 'Продолжение' },
  prequel: { label: 'Предыстория' },
  summary: { label: 'Обобщение' },
  full_story: { label: 'Обобщение', reverse: true },
  side_story: { label: 'Побочная история' },
  parent_story: { label: 'Побочная история', reverse: true },
  spin_off: { label: 'Спин-офф' },
  alternative_version: { label: 'Альтернативная версия' },
  alternative_setting: { label: 'Альтернативная вселенная' },
  character: { label: 'Общие персонажи' },
  other: { label: 'Другое' },
};

/**
 * Id тайтла на Shikimori из ссылки вида https://shikimori.one/animes/21
 */
export function parseShikimoriId(
  href: string | null | undefined,
): number | null {
  const match = href ? /\/animes\/[a-z]*(\d+)/.exec(href) : null;
  return match ? Number(match[1]) : null;
}

/** Slug Animelib по адресу тайтла на Shikimori: /animes/21-one-piece → one-piece-anime */
export function animelibSlugFromShikimoriUrl(url: string): string | null {
  const match = /\/animes\/[a-z]*\d+-([^/?#]+)/.exec(url);
  return match ? `${match[1]}-anime` : null;
}

/**
 * Ключ узла для тайтла Shikimori, ещё не сопоставленного с Animelib
 */
export function shikimoriKey(id: number): string {
  return `shikimori:${id}`;
}

/** Дата выхода в виде YYYY-MM-DD */
export function shikimoriReleaseDate(
  node: ShikimoriFranchiseNode,
): string | null {
  if (node.year === null || node.date === null) return null;

  return new Date((node.date + SHIKIMORI_DATE_OFFSET) * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Связь графа по связи Shikimori; ключи узлов берёт из keyOf
 */
export function shikimoriEdge(
  link: ShikimoriFranchiseLink,
  keyOf: (id: number) => string,
): FranchiseEdge {
  const relation = RELATIONS[link.relation] ?? RELATIONS.other;
  const source = keyOf(link.source_id);
  const target = keyOf(link.target_id);

  return relation.reverse
    ? normalizeEdge(target, source, relation.label)
    : normalizeEdge(source, target, relation.label);
}

/** Граф хронологии из франшизы Shikimori */
export function buildShikimoriGraph(
  franchise: ShikimoriFranchise,
  current: FranchiseCurrent,
  matches: Map<number, AnimelibMatch> = new Map(),
): FranchiseGraph {
  const nodes = franchise.nodes.filter(
    (node) => !EXCLUDED_KINDS.has(node.kind),
  );
  const ids = new Set(nodes.map((node) => node.id));
  const keyOf = (id: number) =>
    id === current.id ? current.slug : shikimoriKey(id);

  const titles = new Map<string, FranchiseTitle>(
    nodes.map((node) => {
      const isCurrent = node.id === current.id;
      const key = keyOf(node.id);
      const match = matches.get(node.id);
      const shikimoriCover =
        node.image_url && !node.image_url.includes('missing')
          ? node.image_url
          : null;

      let availability: FranchiseTitle['availability'] = 'pending';
      if (match && match.slug) availability = 'available';
      else if (match)
        availability = match.restricted ? 'restricted' : 'missing';
      if (isCurrent) availability = 'available';

      return [
        key,
        {
          slugUrl: key,
          name: node.name,
          type: node.kind,
          cover: match?.cover ?? shikimoriCover,
          releaseDate: shikimoriReleaseDate(node),
          link: isCurrent ? current.slug : (match?.slug ?? null),
          availability,
          lookupSlug: animelibSlugFromShikimoriUrl(node.url),
          shikimoriId: node.id,
        },
      ];
    }),
  );

  const edges = franchise.links
    .filter((link) => ids.has(link.source_id) && ids.has(link.target_id))
    .map((link) => shikimoriEdge(link, keyOf));

  return { titles, edges: mergeEdges(edges), curated: true };
}

/** Порядок поиска на Animelib: сначала тайтлы, ближние по времени к текущему, невышедшие — в конце */
export function matchOrder(
  franchise: ShikimoriFranchise,
  currentId: number,
): ShikimoriFranchiseNode[] {
  const current = franchise.nodes.find((node) => node.id === currentId);
  const anchor = current?.year ?? null;
  const distance = (node: ShikimoriFranchiseNode) =>
    node.year === null || anchor === null
      ? Infinity
      : Math.abs(node.year - anchor);

  return franchise.nodes
    .filter((node) => node.id !== currentId && !EXCLUDED_KINDS.has(node.kind))
    .sort((a, b) => distance(a) - distance(b) || a.id - b.id);
}

/** Найденный на Animelib тайтл засчитывается, только если он ссылается на тот же тайтл Shikimori */
export function toAnimelibMatch(
  found: {
    slug_url: string;
    shikimori_href?: string | null;
    cover?: { thumbnail?: string; default?: string } | null;
  } | null,
  shikimoriId: number,
): AnimelibMatch {
  if (!found || parseShikimoriId(found.shikimori_href) !== shikimoriId) {
    return { slug: null, cover: null };
  }

  return {
    slug: found.slug_url,
    cover: found.cover?.thumbnail || found.cover?.default || null,
  };
}

/**
 * Не найденный без входа тайтл мог быть скрыт по возрасту, а не отсутствовать
 */
export function markGuestMiss(
  match: AnimelibMatch,
  authorized: boolean,
): AnimelibMatch {
  return match.slug || authorized ? match : { ...match, restricted: true };
}
