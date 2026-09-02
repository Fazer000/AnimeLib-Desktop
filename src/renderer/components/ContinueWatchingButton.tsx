import React, { useRef, useState } from 'react';
import { Box, Menu, MenuItem, ListItemText, Zoom } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BookmarkRounded } from '@mui/icons-material';
import { BookmarkItem } from '../api/animeApi';
import EdgeActionButton from './EdgeActionButton';
import {
  BOOKMARKS_COVER,
  BOOKMARKS_PANEL_DURATION_MS,
  BOOKMARKS_PANEL_MAX_HEIGHT,
  BOOKMARKS_PANEL_RADIUS,
  BOOKMARKS_PANEL_WIDTH,
  FLOATING_BUTTONS_GAP,
  FLOATING_BUTTONS_TOP,
  OfflineContinueItem,
  buildOfflineUrl,
} from '../../constants';
import useImageWithReferer from '../hooks/useImageWithReferer';
import {
  formatContinueLabel,
  formatOfflineLabel,
} from '../utils/bookmarkFormat';
import {
  ACCENT,
  ACCENT_LIGHT,
  BORDER,
  SURFACE_DIALOG,
  WHITE,
} from '../theme/palette';

const PAPER_SX = {
  width: BOOKMARKS_PANEL_WIDTH,
  maxHeight: BOOKMARKS_PANEL_MAX_HEIGHT,
  overflowY: 'auto',
  backgroundColor: SURFACE_DIALOG,
  backgroundImage: 'none',
  border: `1px solid ${alpha(ACCENT, 0.45)}`,
  borderLeft: 'none',
  borderRadius: `0 ${BOOKMARKS_PANEL_RADIUS}px ${BOOKMARKS_PANEL_RADIUS}px ${BOOKMARKS_PANEL_RADIUS}px`,
  boxShadow: 'none',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(BORDER, 0.8),
    borderRadius: 3,
  },
};

const ROW_SX = {
  gap: 1.25,
  px: 1.5,
  py: 0.75,
  '&:hover': { backgroundColor: alpha(ACCENT, 0.14) },
};

const COVER_SX = {
  width: BOOKMARKS_COVER.width,
  height: BOOKMARKS_COVER.height,
  flexShrink: 0,
  borderRadius: 1,
  overflow: 'hidden',
  backgroundColor: alpha(BORDER, 0.35),
};

const TITLE_PROPS = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: WHITE,
  noWrap: true,
};

const CAPTION_PROPS = {
  fontSize: '0.75rem',
  sx: { color: ACCENT_LIGHT },
};

interface BookmarkRowProps {
  bookmark: BookmarkItem;
  onSelect: (bookmark: BookmarkItem) => void;
}

/**
 * Строка закладки с миниатюрой
 */
function BookmarkRow({ bookmark, onSelect }: BookmarkRowProps) {
  const coverUrl = useImageWithReferer(bookmark.coverUrl || undefined);

  return (
    <MenuItem sx={ROW_SX} onClick={() => onSelect(bookmark)}>
      <Box sx={COVER_SX}>
        {coverUrl && (
          <Box
            component="img"
            src={coverUrl}
            alt={bookmark.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>

      <ListItemText
        primary={bookmark.title}
        secondary={formatContinueLabel(bookmark.episodeNumber)}
        primaryTypographyProps={TITLE_PROPS}
        secondaryTypographyProps={CAPTION_PROPS}
      />
    </MenuItem>
  );
}

interface OfflineRowProps {
  item: OfflineContinueItem;
  onSelect: (item: OfflineContinueItem) => void;
}

/**
 * Строка скачанного с локальной обложкой
 */
function OfflineRow({ item, onSelect }: OfflineRowProps) {
  const coverUrl = item.coverFileName
    ? buildOfflineUrl(item.coverFileName)
    : '';

  return (
    <MenuItem sx={ROW_SX} onClick={() => onSelect(item)}>
      <Box sx={COVER_SX}>
        {coverUrl && (
          <Box
            component="img"
            src={coverUrl}
            alt={item.title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </Box>

      <ListItemText
        primary={item.title}
        secondary={formatOfflineLabel(item.episodeNumber)}
        primaryTypographyProps={TITLE_PROPS}
        secondaryTypographyProps={CAPTION_PROPS}
      />
    </MenuItem>
  );
}

interface ContinueWatchingButtonProps {
  bookmarks: BookmarkItem[];
  onSelect: (bookmark: BookmarkItem) => void;
  // eslint-disable-next-line react/require-default-props
  offlineItems?: OfflineContinueItem[];
  // eslint-disable-next-line react/require-default-props
  onSelectOffline?: (item: OfflineContinueItem) => void;
  // eslint-disable-next-line react/require-default-props
  useOffline?: boolean;
}

/**
 * Плавающая кнопка со списком закладок «Смотрю»
 */
function ContinueWatchingButton({
  bookmarks,
  onSelect,
  offlineItems = [],
  onSelectOffline,
  useOffline = false,
}: ContinueWatchingButtonProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [attached, setAttached] = useState<boolean>(false);

  const showOffline = useOffline && offlineItems.length > 0;

  /**
   * Закрывает меню, уводя фокус наружу: иначе он останется на пункте
   * внутри поддерева, которое MUI помечает aria-hidden на время анимации
   */
  const closeMenu = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    setOpen(false);
  };

  const handleSelect = (bookmark: BookmarkItem) => {
    closeMenu();
    onSelect(bookmark);
  };

  const handleSelectOffline = (item: OfflineContinueItem) => {
    closeMenu();
    onSelectOffline?.(item);
  };

  return (
    <Zoom in={showOffline || bookmarks.length > 0}>
      <Box
        ref={anchorRef}
        sx={{
          position: 'fixed',
          top: FLOATING_BUTTONS_TOP + FLOATING_BUTTONS_GAP,
          left: 0,
          zIndex: 1200,
          display: 'flex',
        }}
      >
        <EdgeActionButton
          side="left"
          solid
          docked={attached}
          active={attached}
          label="Закладки"
          color={WHITE}
          onClick={() => {
            setAttached(true);
            setOpen(true);
          }}
          icon={<BookmarkRounded sx={{ fontSize: 24, color: ACCENT }} />}
        />

        <Menu
          anchorEl={anchorRef.current}
          open={open}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          marginThreshold={0}
          transitionDuration={BOOKMARKS_PANEL_DURATION_MS}
          TransitionProps={{ onExited: () => setAttached(false) }}
          slotProps={{ paper: { sx: PAPER_SX }, list: { sx: { py: 0.75 } } }}
        >
          {showOffline
            ? offlineItems.map((item) => (
                <OfflineRow
                  key={`${item.animeId}-${item.episodeId}`}
                  item={item}
                  onSelect={handleSelectOffline}
                />
              ))
            : bookmarks.map((bookmark) => (
                <BookmarkRow
                  key={bookmark.animeSlugUrl}
                  bookmark={bookmark}
                  onSelect={handleSelect}
                />
              ))}
        </Menu>
      </Box>
    </Zoom>
  );
}

export default ContinueWatchingButton;
