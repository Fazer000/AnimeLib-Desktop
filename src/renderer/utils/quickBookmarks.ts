/**
 * Сборка быстрых закладок из нескольких папок
 */
import type { BookmarkListItem } from '../api/animeApi';

/**
 * Время обновления закладки в мс; без даты закладка уходит в конец
 */
const updatedAtOf = (item: BookmarkListItem): number => {
  const time = Date.parse(item.updated_at ?? '');

  return Number.isNaN(time) ? 0 : time;
};

/**
 * Склеивает списки папок в один: от свежих к старым, без повторов тайтла
 * и записей без адреса, не длиннее limit
 */
export function mergeBookmarkLists(
  lists: BookmarkListItem[][],
  limit: number,
): BookmarkListItem[] {
  const seen = new Set<string>();

  return lists
    .flat()
    .filter((item) => item?.media?.slug_url)
    .sort((a, b) => updatedAtOf(b) - updatedAtOf(a))
    .filter((item) => {
      if (seen.has(item.media.slug_url)) return false;
      seen.add(item.media.slug_url);
      return true;
    })
    .slice(0, limit);
}

export default mergeBookmarkLists;
