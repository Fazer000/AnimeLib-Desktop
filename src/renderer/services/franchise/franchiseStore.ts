import {
  FRANCHISE_CACHE_LIMIT,
  FRANCHISE_CACHE_STORAGE_KEY,
} from '../../../constants';
import {
  CachedFranchise,
  findCachedFranchise,
  putCachedFranchise,
} from '../../utils/franchiseCache';
import { createLogger } from '../../../shared/logger';

const log = createLogger('franchiseStore');

const readAll = (): CachedFranchise[] => {
  try {
    const raw = localStorage.getItem(FRANCHISE_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    log.warn('Franchise cache unreadable, starting empty:', error);
    return [];
  }
};

/**
 * Сохранённая франшиза, в которую входит тайтл с этим id Shikimori
 */
export function loadCachedFranchise(
  shikimoriId: number,
): CachedFranchise | null {
  return findCachedFranchise(readAll(), shikimoriId);
}

/**
 * Сохраняет франшизу вместо прежней записи о ней
 */
export function saveCachedFranchise(entry: CachedFranchise): void {
  try {
    localStorage.setItem(
      FRANCHISE_CACHE_STORAGE_KEY,
      JSON.stringify(
        putCachedFranchise(readAll(), entry, FRANCHISE_CACHE_LIMIT),
      ),
    );
  } catch (error) {
    log.warn('Franchise cache not saved:', error);
  }
}
