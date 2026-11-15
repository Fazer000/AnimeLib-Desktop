import {
  FRANCHISE_ANIMELIB_CACHE_STORAGE_KEY,
  FRANCHISE_CACHE_LIMIT,
  FRANCHISE_CACHE_STORAGE_KEY,
  FRANCHISE_CACHE_TTL_MS,
} from '../../../constants';
import {
  CachedFranchise,
  findCachedFranchise,
  putCachedFranchise,
} from '../../utils/franchiseCache';
import type {
  FranchiseGraph,
  FranchiseTitle,
} from '../../utils/franchiseGraph';
import { createLogger } from '../../../shared/logger';

const log = createLogger('franchiseStore');

interface CachedAnimelibGraph {
  savedAt: number;
  titles: FranchiseTitle[];
  edges: FranchiseGraph['edges'];
}

const readAll = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    log.warn('Franchise cache unreadable, starting empty:', error);
    return [];
  }
};

const writeAll = (key: string, entries: unknown[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch (error) {
    log.warn('Franchise cache not saved:', error);
  }
};

/**
 * Сохранённая франшиза, в которую входит тайтл с этим id Shikimori
 */
export function loadCachedFranchise(
  shikimoriId: number,
): CachedFranchise | null {
  return findCachedFranchise(
    readAll<CachedFranchise>(FRANCHISE_CACHE_STORAGE_KEY),
    shikimoriId,
  );
}

/**
 * Сохраняет франшизу вместо прежней записи о ней
 */
export function saveCachedFranchise(entry: CachedFranchise): void {
  const entries = readAll<CachedFranchise>(FRANCHISE_CACHE_STORAGE_KEY);
  writeAll(
    FRANCHISE_CACHE_STORAGE_KEY,
    putCachedFranchise(entries, entry, FRANCHISE_CACHE_LIMIT),
  );
}

/** Читает свежий граф связей AnimeLib из кэша. */
export function loadCachedAnimelibGraph(
  slugUrl: string,
): FranchiseGraph | null {
  const now = Date.now();
  const entry = readAll<CachedAnimelibGraph>(
    FRANCHISE_ANIMELIB_CACHE_STORAGE_KEY,
  ).find(
    (item) =>
      now - item.savedAt < FRANCHISE_CACHE_TTL_MS &&
      item.titles.some((title) => title.slugUrl === slugUrl),
  );

  return entry
    ? {
        titles: new Map(entry.titles.map((title) => [title.slugUrl, title])),
        edges: entry.edges,
      }
    : null;
}

/** Сохраняет завершённый граф связей AnimeLib. */
export function saveCachedAnimelibGraph(graph: FranchiseGraph): void {
  const savedAt = Date.now();
  const entries = readAll<CachedAnimelibGraph>(
    FRANCHISE_ANIMELIB_CACHE_STORAGE_KEY,
  ).filter(
    (entry) =>
      savedAt - entry.savedAt < FRANCHISE_CACHE_TTL_MS &&
      !entry.titles.some((title) => graph.titles.has(title.slugUrl)),
  );

  writeAll(
    FRANCHISE_ANIMELIB_CACHE_STORAGE_KEY,
    [
      { savedAt, titles: [...graph.titles.values()], edges: graph.edges },
      ...entries,
    ].slice(0, FRANCHISE_CACHE_LIMIT),
  );
}
