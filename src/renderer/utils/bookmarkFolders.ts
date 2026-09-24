/**
 * Папки закладок: отбор папок аниме и папка для сохранения прогресса
 */
import { ANIME_SITE_ID, BOOKMARK_STATUS_WATCHING } from '../../constants';

export interface BookmarkFolderLike {
  id: number;
  site_ids?: number[] | null;
}

/**
 * Оставляет папки сайта аниме, сохраняя порядок сервера
 */
export function filterAnimeFolders<T extends BookmarkFolderLike>(
  folders: T[] | null | undefined,
): T[] {
  return (folders ?? []).filter((folder) =>
    folder.site_ids?.includes(ANIME_SITE_ID),
  );
}

/**
 * Папка, в которую пишется прогресс: текущая, а без закладки — «Смотрю»
 */
export function resolveProgressStatus(
  currentStatus: number | null | undefined,
): number {
  return currentStatus || BOOKMARK_STATUS_WATCHING;
}
