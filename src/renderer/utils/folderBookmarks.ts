/**
 * Папки быстрого доступа на панели: «Запланировано» и «Любимое»
 */
import {
  BOOKMARK_STATUS_FAVORITE,
  BOOKMARK_STATUS_PLANNED,
  BOOKMARK_STATUS_READING,
  BOOKMARK_STATUS_READING_FAVORITE,
  BOOKMARK_STATUS_READING_PLANNED,
  LibSiteKind,
} from '../../constants';
import type { BookmarkItem, BookmarkListItem } from '../api/animeApi';
import { formatContinueLabel } from './bookmarkFormat';

export type QuickFolder = 'planned' | 'favorites';

export const QUICK_FOLDERS: readonly QuickFolder[] = ['planned', 'favorites'];

const FOLDER_LABELS: Record<QuickFolder, string> = {
  planned: 'Запланировано',
  favorites: 'Любимое',
};

/** Название папки на кнопке и в заголовке подменю */
export function getFolderLabel(folder: QuickFolder): string {
  return FOLDER_LABELS[folder];
}

/** Номер папки на сайте: у аниме и у манги с ранобэ они разные */
export function getFolderStatus(
  kind: LibSiteKind,
  folder: QuickFolder,
): number {
  if (kind === 'anime') {
    return folder === 'planned'
      ? BOOKMARK_STATUS_PLANNED
      : BOOKMARK_STATUS_FAVORITE;
  }

  return folder === 'planned'
    ? BOOKMARK_STATUS_READING_PLANNED
    : BOOKMARK_STATUS_READING_FAVORITE;
}

/** Закладки аниме в строки меню; записи без адреса пропускаются */
export function toAnimeBookmarkItems(items: unknown[]): BookmarkItem[] {
  return (items as BookmarkListItem[])
    .filter((item) => item?.media?.slug_url)
    .map((item) => ({
      animeSlugUrl: item.media.slug_url,
      title: item.media.rus_name || item.media.name || '',
      episodeNumber: item.item?.number || String(item.meta?.item_number ?? ''),
      coverUrl: item.media.cover?.thumbnail || null,
    }));
}

/** Подпись аниме из папки: с серией — продолжение, без неё — начало */
export function formatFolderAnimeLabel(episodeNumber: string): string {
  return episodeNumber.trim()
    ? formatContinueLabel(episodeNumber)
    : 'Начать просмотр';
}

/**
 * Папки, которые подменю сайта показывают и которые стоит загрузить
 * заранее: у аниме «Смотрю» живёт отдельно, у манги и ранобэ — «Читаю»
 */
export function getSiteFolderStatuses(kind: LibSiteKind): number[] {
  const folders = QUICK_FOLDERS.map((folder) => getFolderStatus(kind, folder));

  return kind === 'anime' ? folders : [BOOKMARK_STATUS_READING, ...folders];
}
