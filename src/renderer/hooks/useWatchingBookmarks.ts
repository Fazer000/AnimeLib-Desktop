import { useEffect, useState } from 'react';
import { BookmarkItem } from '../api/animeApi';
import { bookmarksStore } from '../services/bookmarks';

/**
 * Держит список закладок «Смотрю» актуальным
 */
function useWatchingBookmarks(refreshKey?: unknown): BookmarkItem[] {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    bookmarksStore.getItems(),
  );

  useEffect(() => bookmarksStore.subscribe(setBookmarks), []);

  useEffect(() => {
    bookmarksStore.refresh();
  }, [refreshKey]);

  useEffect(() => {
    const ipc = (window as any).electron?.ipcRenderer;

    if (!ipc) {
      return undefined;
    }

    return ipc.on('bookmarks-changed', () => bookmarksStore.refresh());
  }, []);

  return bookmarks;
}

export default useWatchingBookmarks;
