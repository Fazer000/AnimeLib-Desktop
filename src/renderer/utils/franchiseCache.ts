/**
 * Кэш хронологий между запусками: франшиза из Shikimori и найденные
 * на Animelib тайтлы со временем проверки
 */
import type { AnimelibMatch, ShikimoriFranchise } from './shikimoriFranchise';

export interface CachedMatch {
  slug: string | null;
  cover: string | null;
  checkedAt: number;
}

export interface CachedFranchise {
  franchise: ShikimoriFranchise;
  savedAt: number;
  matches: Record<number, CachedMatch>;
}

export interface MatchTtl {
  found: number;
  missing: number;
}

/**
 * Запись, в которой есть тайтл с этим id Shikimori
 */
export function findCachedFranchise(
  entries: CachedFranchise[],
  shikimoriId: number,
): CachedFranchise | null {
  return (
    entries.find((entry) =>
      entry.franchise.nodes.some((node) => node.id === shikimoriId),
    ) ?? null
  );
}

/**
 * Ещё свежие результаты поиска: найденные живут дольше, ненайденные —
 * меньше, ведь тайтл могут добавить на сайт
 */
export function freshMatches(
  entry: CachedFranchise,
  now: number,
  ttl: MatchTtl,
): Map<number, AnimelibMatch> {
  const result = new Map<number, AnimelibMatch>();

  Object.entries(entry.matches).forEach(([id, match]) => {
    const limit = match.slug ? ttl.found : ttl.missing;
    if (now - match.checkedAt < limit) {
      result.set(Number(id), { slug: match.slug, cover: match.cover });
    }
  });

  return result;
}

/**
 * Запись для сохранения. Тайтлы, не найденные без входа, не сохраняются:
 * после входа их нужно проверить заново. Время проверки старых
 * результатов не меняется
 */
export function toCachedFranchise(
  franchise: ShikimoriFranchise,
  matches: Map<number, AnimelibMatch>,
  previous: CachedFranchise | null,
  now: number,
): CachedFranchise {
  const ids = new Set(franchise.nodes.map((node) => node.id));
  const saved: Record<number, CachedMatch> = {};

  matches.forEach((match, id) => {
    if (match.restricted || !ids.has(id)) return;

    const old = previous?.matches[id];
    const same = old && old.slug === match.slug;
    saved[id] = {
      slug: match.slug,
      cover: match.cover,
      checkedAt: same ? old.checkedAt : now,
    };
  });

  return { franchise, savedAt: now, matches: saved };
}

/**
 * Кладёт запись в кэш вместо прежней той же франшизы; при переполнении
 * вытесняются давно сохранённые
 */
export function putCachedFranchise(
  entries: CachedFranchise[],
  entry: CachedFranchise,
  limit: number,
): CachedFranchise[] {
  const ids = new Set(entry.franchise.nodes.map((node) => node.id));
  const others = entries.filter(
    (item) => !item.franchise.nodes.some((node) => ids.has(node.id)),
  );

  return [entry, ...others]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, Math.max(1, limit));
}
