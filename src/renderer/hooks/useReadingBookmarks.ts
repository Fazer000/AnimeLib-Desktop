import { useMemo } from 'react';
import { animeApi } from '../api/animeApi';
import { BOOKMARK_STATUS_READING, LibSite } from '../../constants';
import { ReadingBookmark, toReadingBookmarks } from '../utils/readingBookmarks';
import useSiteBookmarks from './useSiteBookmarks';

interface ReadingBookmarksState {
  items: ReadingBookmark[];
  loading: boolean;
  signedIn: boolean;
}

/** Закладки папки сайта манги или ранобэ (по умолчанию «Читаю») */
function useReadingBookmarks(
  site: LibSite,
  active: boolean,
  status: number = BOOKMARK_STATUS_READING,
): ReadingBookmarksState {
  const { items, loading, signedIn } = useSiteBookmarks(
    site,
    status,
    active && site.kind !== 'anime',
  );
  const reading = useMemo(
    () => toReadingBookmarks(items, site.kind, animeApi.userId()),
    [items, site.kind],
  );

  return { items: reading, loading, signedIn };
}

export default useReadingBookmarks;
