import React, { useRef, useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemText,
  Zoom,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { CustomColors } from '@mui/material/styles';
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

const paperSx = (colors: CustomColors) => ({
  width: BOOKMARKS_PANEL_WIDTH,
  maxHeight: BOOKMARKS_PANEL_MAX_HEIGHT,
  overflowY: 'auto',
  backgroundColor: `rgba(${colors.overlayRgb}, 0.72)`,
  backdropFilter: 'blur(14px)',
  backgroundImage: 'none',
  border: `1px solid ${alpha(colors.secondaryColor, 0.45)}`,
  borderLeft: 'none',
  borderRadius: `0 ${BOOKMARKS_PANEL_RADIUS}px ${BOOKMARKS_PANEL_RADIUS}px ${BOOKMARKS_PANEL_RADIUS}px`,
  boxShadow: 'none',
  '&::-webkit-scrollbar': { width: 6 },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(colors.borderColor, 0.8),
    borderRadius: 3,
  },
});

const rowSx = (colors: CustomColors) => ({
  gap: 1.25,
  px: 1.5,
  py: 0.75,
  '&:hover': { backgroundColor: alpha(colors.secondaryColor, 0.14) },
});

const coverSx = (colors: CustomColors) => ({
  width: BOOKMARKS_COVER.width,
  height: BOOKMARKS_COVER.height,
  flexShrink: 0,
  borderRadius: 1,
  overflow: 'hidden',
  backgroundColor: alpha(colors.borderColor, 0.35),
});

const titleProps = (colors: CustomColors) => ({
  fontSize: '0.875rem',
  fontWeight: 600,
  color: colors.dialogTextColor,
  noWrap: true,
});

const captionProps = (colors: CustomColors) => ({
  fontSize: '0.75rem',
  sx: { color: colors.accentSoftColor },
});

interface BookmarkRowProps {
  bookmark: BookmarkItem;
  onSelect: (bookmark: BookmarkItem) => void;
}

/**
 * Строка закладки с миниатюрой
 */
function BookmarkRow({ bookmark, onSelect }: BookmarkRowProps) {
  const { customColors } = useTheme().palette;
  const coverUrl = useImageWithReferer(bookmark.coverUrl || undefined);

  return (
    <MenuItem sx={rowSx(customColors)} onClick={() => onSelect(bookmark)}>
      <Box sx={coverSx(customColors)}>
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
        primaryTypographyProps={titleProps(customColors)}
        secondaryTypographyProps={captionProps(customColors)}
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
  const { customColors } = useTheme().palette;
  const coverUrl = item.coverFileName
    ? buildOfflineUrl(item.coverFileName)
    : '';

  return (
    <MenuItem sx={rowSx(customColors)} onClick={() => onSelect(item)}>
      <Box sx={coverSx(customColors)}>
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
        primaryTypographyProps={titleProps(customColors)}
        secondaryTypographyProps={captionProps(customColors)}
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
  const { customColors } = useTheme().palette;
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
          color={customColors.dialogTextColor}
          onClick={() => {
            setAttached(true);
            setOpen(true);
          }}
          icon={
            <BookmarkRounded
              sx={{ fontSize: 24, color: customColors.accentSoftColor }}
            />
          }
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
          slotProps={{
            paper: { sx: paperSx(customColors) },
            list: { sx: { py: 0.75 } },
          }}
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
