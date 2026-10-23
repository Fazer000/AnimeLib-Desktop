/** Общее состояние быстрых закладок и папок сайтов */
import { animeApi } from '../../api/animeApi';
import { BOOKMARKS_REFRESH_DELAY_MS } from '../../../constants';
import { SiteBookmarksStore } from './SiteBookmarksStore';

export { BookmarksStore, bookmarksStore } from './BookmarksStore';
export type { BookmarksListener } from './BookmarksStore';
export { SiteBookmarksStore, siteBookmarksKey } from './SiteBookmarksStore';
export type { SiteBookmarksSnapshot } from './SiteBookmarksStore';

export const siteBookmarksStore = new SiteBookmarksStore(
  animeApi.getSiteBookmarks,
  BOOKMARKS_REFRESH_DELAY_MS,
);
