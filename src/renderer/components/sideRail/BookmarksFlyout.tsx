import React from 'react';
import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import {
  BOOKMARKS_COVER,
  LibSite,
  OfflineContinueItem,
  buildOfflineUrl,
} from '../../../constants';
import { BookmarkItem } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import useReadingBookmarks from '../../hooks/useReadingBookmarks';
import {
  EMPTY_LIST_TEXT,
  formatContinueLabel,
  formatOfflineLabel,
} from '../../utils/bookmarkFormat';
import { ReadingBookmark } from '../../utils/readingBookmarks';

interface RowProps {
  coverUrl: string;
  title: string;
  caption: string;
  onClick: () => void;
}

/**
 * Строка закладки: обложка, название и куда она ведёт
 */
export function Row({ coverUrl, title, caption, onClick }: RowProps) {
  const { customColors } = useTheme().palette;

  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
        gap: 1.25,
        p: 1,
        borderRadius: 2,
        textAlign: 'left',
        '&:hover': { backgroundColor: customColors.accentQuietColor },
      }}
    >
      <Box
        sx={{
          width: BOOKMARKS_COVER.width,
          height: BOOKMARKS_COVER.height,
          flexShrink: 0,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: customColors.mutedColor,
        }}
      >
        {coverUrl && (
          <Box
            component="img"
            src={coverUrl}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          noWrap
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: customColors.dialogTextColor,
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{ fontSize: '0.75rem', color: customColors.accentSoftColor }}
        >
          {caption}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

export function RemoteRow({
  cover,
  ...rest
}: Omit<RowProps, 'coverUrl'> & { cover: string | null }) {
  const coverUrl = useImageWithReferer(cover || undefined);
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Row coverUrl={coverUrl} {...rest} />;
}

export function Notice({ text }: { text: string }) {
  const { customColors } = useTheme().palette;

  return (
    <Typography
      sx={{
        px: 1,
        py: 2,
        fontSize: '0.8rem',
        color: customColors.mutedTextColor,
      }}
    >
      {text}
    </Typography>
  );
}

interface ReadingListProps {
  site: LibSite;
  onOpen: (bookmark: ReadingBookmark) => void;
}

function ReadingList({ site, onOpen }: ReadingListProps) {
  const { items, loading, signedIn } = useReadingBookmarks(site, true);

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

interface BookmarksFlyoutProps {
  site: LibSite;
  watching: BookmarkItem[];
  offlineItems: OfflineContinueItem[];
  useOffline: boolean;
  onSelectWatching: (bookmark: BookmarkItem) => void;
  onSelectOffline: (item: OfflineContinueItem) => void;
  onOpenReading: (bookmark: ReadingBookmark) => void;
}

/** Закладки текущего сайта */
function BookmarksFlyout({
  site,
  watching,
  offlineItems,
  useOffline,
  onSelectWatching,
  onSelectOffline,
  onOpenReading,
}: BookmarksFlyoutProps) {
  if (site.kind !== 'anime') {
    return <ReadingList site={site} onOpen={onOpenReading} />;
  }

  if (useOffline && offlineItems.length > 0) {
    return (
      <>
        {offlineItems.map((item) => (
          <Row
            key={`${item.animeId}-${item.episodeId}`}
            coverUrl={
              item.coverFileName ? buildOfflineUrl(item.coverFileName) : ''
            }
            title={item.title}
            caption={formatOfflineLabel(item.episodeNumber)}
            onClick={() => onSelectOffline(item)}
          />
        ))}
      </>
    );
  }

  if (watching.length === 0) {
    return <Notice text={EMPTY_LIST_TEXT} />;
  }

  return (
    <>
      {watching.map((bookmark) => (
        <RemoteRow
          key={bookmark.animeSlugUrl}
          cover={bookmark.coverUrl}
          title={bookmark.title}
          caption={formatContinueLabel(bookmark.episodeNumber)}
          onClick={() => onSelectWatching(bookmark)}
        />
      ))}
    </>
  );
}

export default BookmarksFlyout;
