import { useEffect, useState } from 'react';
import { animeApi } from '../api/animeApi';
import { BOOKMARK_STATUS_READING, LibSite } from '../../constants';
import { ReadingBookmark, toReadingBookmarks } from '../utils/readingBookmarks';
import { createLogger } from '../../shared/logger';

const log = createLogger('useReadingBookmarks');

interface ReadingBookmarksState {
  items: ReadingBookmark[];
  loading: boolean;
  signedIn: boolean;
}

/**
 * Закладки «Читаю» сайта манги или ранобэ; загружаются заново при каждом
 * открытии подменю, пока active
 */
function useReadingBookmarks(
  site: LibSite,
  active: boolean,
): ReadingBookmarksState {
  const [state, setState] = useState<ReadingBookmarksState>({
    items: [],
    loading: false,
    signedIn: true,
  });

  useEffect(() => {
    if (!active || site.kind === 'anime') return undefined;

    if (!animeApi.hasUser()) {
      setState({ items: [], loading: false, signedIn: false });
      return undefined;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, signedIn: true }));

    const load = async () => {
      try {
        const raw = await animeApi.getSiteBookmarks(
          site.siteId,
          BOOKMARK_STATUS_READING,
        );
        if (!cancelled) {
          setState({
            items: toReadingBookmarks(raw, site.kind, animeApi.userId()),
            loading: false,
            signedIn: true,
          });
        }
      } catch (error) {
        log.error('Reading bookmarks failed:', site.name, error);
        if (!cancelled) {
          setState({ items: [], loading: false, signedIn: true });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [site, active]);

  return state;
}

export default useReadingBookmarks;
