import { useEffect, useState } from 'react';
import { animeApi } from '../api/animeApi';
import { LibSite } from '../../constants';
import {
  siteBookmarksKey,
  SiteBookmarksSnapshot,
  siteBookmarksStore,
} from '../services/bookmarks';

export interface SiteBookmarksState {
  items: unknown[];
  loading: boolean;
  signedIn: boolean;
}

const EMPTY: SiteBookmarksSnapshot = { items: [], loaded: false };

/**
 * Закладки папки сайта: сохранённый список сразу, свежий — в фоне
 */
function useSiteBookmarks(
  site: LibSite,
  status: number,
  active: boolean,
): SiteBookmarksState {
  const userId = animeApi.userId();
  const key = userId ? siteBookmarksKey(userId, site.siteId, status) : null;
  const [snapshot, setSnapshot] = useState<SiteBookmarksSnapshot>(() =>
    key ? siteBookmarksStore.get(key) : EMPTY,
  );

  useEffect(() => {
    if (!active || !key) return undefined;

    const unsubscribe = siteBookmarksStore.subscribe(
      key,
      site.siteId,
      status,
      setSnapshot,
    );
    siteBookmarksStore.load(key, site.siteId, status);
    return unsubscribe;
  }, [key, active, site.siteId, status]);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!active || !ipc) return undefined;

    return ipc.on('bookmarks-changed', () => siteBookmarksStore.invalidate());
  }, [active]);

  return {
    items: snapshot.items,
    loading: !snapshot.loaded,
    signedIn: key !== null,
  };
}

/**
 * Загружает папки сайта заранее, чтобы подменю открывались сразу
 */
export function usePrefetchSiteBookmarks(
  site: LibSite,
  statuses: number[],
): void {
  const userId = animeApi.userId();
  const statusList = statuses.join(',');

  useEffect(() => {
    if (!userId) return;

    statusList
      .split(',')
      .map(Number)
      .forEach((status) =>
        siteBookmarksStore.load(
          siteBookmarksKey(userId, site.siteId, status),
          site.siteId,
          status,
        ),
      );
  }, [userId, site.siteId, statusList]);
}

export default useSiteBookmarks;
