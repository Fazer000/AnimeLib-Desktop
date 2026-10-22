import React, { useMemo } from 'react';
import { LibSite } from '../../../constants';
import { BookmarkItem } from '../../api/animeApi';
import useSiteBookmarks from '../../hooks/useSiteBookmarks';
import useReadingBookmarks from '../../hooks/useReadingBookmarks';
import {
  QuickFolder,
  formatFolderAnimeLabel,
  getFolderStatus,
  toAnimeBookmarkItems,
} from '../../utils/folderBookmarks';
import { EMPTY_LIST_TEXT } from '../../utils/bookmarkFormat';
import { ReadingBookmark } from '../../utils/readingBookmarks';
import { Notice, RemoteRow } from './BookmarksFlyout';

interface FolderFlyoutProps {
  site: LibSite;
  folder: QuickFolder;
  online: boolean;
  onSelectAnime: (bookmark: BookmarkItem) => void;
  onOpenReading: (bookmark: ReadingBookmark) => void;
}

interface FolderListProps {
  site: LibSite;
  status: number;
}

function AnimeFolder({
  site,
  status,
  onSelect,
}: FolderListProps & { onSelect: (bookmark: BookmarkItem) => void }) {
  const { items, loading, signedIn } = useSiteBookmarks(site, status, true);
  const bookmarks = useMemo(() => toAnimeBookmarkItems(items), [items]);

  if (!signedIn)
    return <Notice text="Войдите на сайт, чтобы видеть закладки" />;
  if (loading && bookmarks.length === 0) return <Notice text="Загрузка…" />;
  if (bookmarks.length === 0) return <Notice text={EMPTY_LIST_TEXT} />;

  return (
    <>
      {bookmarks.map((bookmark) => (
        <RemoteRow
          key={bookmark.animeSlugUrl}
          cover={bookmark.coverUrl}
          title={bookmark.title}
          caption={formatFolderAnimeLabel(bookmark.episodeNumber)}
          onClick={() => onSelect(bookmark)}
        />
      ))}
    </>
  );
}

function ReadingFolder({
  site,
  status,
  onOpen,
}: FolderListProps & { onOpen: (bookmark: ReadingBookmark) => void }) {
  const { items, loading, signedIn } = useReadingBookmarks(site, true, status);

  if (!signedIn)
    return <Notice text="Войдите на сайт, чтобы видеть закладки" />;
  if (loading && items.length === 0) return <Notice text="Загрузка…" />;
  if (items.length === 0) return <Notice text={EMPTY_LIST_TEXT} />;

  return (
    <>
      {items.map((item) => (
        <RemoteRow
          key={item.slugUrl}
          cover={item.coverUrl}
          title={item.title}
          caption={item.caption}
          onClick={() => onOpen(item)}
        />
      ))}
    </>
  );
}

/**
 * Папка «Запланировано» или «Любимое» текущего сайта: клик открывает
 * плеер или читалку, как у закладок
 */
function FolderFlyout({
  site,
  folder,
  online,
  onSelectAnime,
  onOpenReading,
}: FolderFlyoutProps) {
  if (!online) return <Notice text="Нет подключения к интернету" />;

  const status = getFolderStatus(site.kind, folder);

  return site.kind === 'anime' ? (
    <AnimeFolder site={site} status={status} onSelect={onSelectAnime} />
  ) : (
    <ReadingFolder site={site} status={status} onOpen={onOpenReading} />
  );
}

export default FolderFlyout;
