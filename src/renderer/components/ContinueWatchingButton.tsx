import React, { useState } from 'react';
import { Box, Zoom, Menu, MenuItem, ListItemText } from '@mui/material';
import { BookmarkRounded } from '@mui/icons-material';
import { BookmarkItem } from '../api/animeApi';
import EdgeActionButton from './EdgeActionButton';
import {
  FLOATING_BUTTONS_GAP,
  FLOATING_BUTTONS_TOP,
  OfflineContinueItem,
  buildOfflineUrl,
} from '../../constants';
import useImageWithReferer from '../hooks/useImageWithReferer';
import { ACCENT, WHITE } from '../theme/palette';

interface BookmarkMenuItemProps {
  bookmark: BookmarkItem;
  onSelect: (bookmark: BookmarkItem) => void;
}

/**
 * Строка списка закладок с миниатюрой
 */
function BookmarkMenuItem({ bookmark, onSelect }: BookmarkMenuItemProps) {
  const coverUrl = useImageWithReferer(bookmark.coverUrl || undefined);

  return (
    <MenuItem onClick={() => onSelect(bookmark)} sx={{ gap: 1.5, py: 1 }}>
      <Box
        sx={{
          width: 34,
          height: 48,
          flexShrink: 0,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: 'rgba(116, 116, 128, 0.2)',
        }}
      >
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
        secondary={`Продолжить · ${bookmark.episodeNumber} эпизод`}
        primaryTypographyProps={{
          fontSize: '0.875rem',
          fontWeight: 600,
          noWrap: true,
        }}
        secondaryTypographyProps={{
          fontSize: '0.75rem',
          sx: { color: 'rgba(255, 255, 255, 0.65)' },
        }}
      />
    </MenuItem>
  );
}

interface OfflineMenuItemProps {
  item: OfflineContinueItem;
  onSelect: (item: OfflineContinueItem) => void;
}

/**
 * Строка списка скачанного с локальной обложкой
 */
function OfflineMenuItem({ item, onSelect }: OfflineMenuItemProps) {
  const coverUrl = item.coverFileName
    ? buildOfflineUrl(item.coverFileName)
    : '';

  return (
    <MenuItem onClick={() => onSelect(item)} sx={{ gap: 1.5, py: 1 }}>
      <Box
        sx={{
          width: 34,
          height: 48,
          flexShrink: 0,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: 'rgba(116, 116, 128, 0.2)',
        }}
      >
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
        secondary={`Скачано · ${item.episodeNumber} эпизод`}
        primaryTypographyProps={{
          fontSize: '0.875rem',
          fontWeight: 600,
          noWrap: true,
        }}
        secondaryTypographyProps={{
          fontSize: '0.75rem',
          sx: { color: ACCENT },
        }}
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const showOffline = useOffline && offlineItems.length > 0;

  const handleSelect = (bookmark: BookmarkItem) => {
    setAnchorEl(null);
    onSelect(bookmark);
  };

  const handleSelectOffline = (item: OfflineContinueItem) => {
    setAnchorEl(null);
    onSelectOffline?.(item);
  };

  return (
    <>
      <Zoom in={showOffline || bookmarks.length > 0}>
        <Box
          sx={{
            position: 'fixed',
            top: FLOATING_BUTTONS_TOP + FLOATING_BUTTONS_GAP,
            left: 0,
            zIndex: 1200,
          }}
        >
          <EdgeActionButton
            side="left"
            solid
            active={Boolean(anchorEl)}
            label="Закладки"
            color={WHITE}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            icon={<BookmarkRounded sx={{ fontSize: 24, color: ACCENT }} />}
          />
        </Box>
      </Zoom>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        marginThreshold={8}
        TransitionProps={{ timeout: 260 }}
        slotProps={{
          paper: {
            sx: {
              ml: 1.5,
              minWidth: 280,
              maxWidth: 360,
              maxHeight: 400,
              overflowY: 'auto',
              transformOrigin: 'left top !important',
              backgroundColor: 'rgba(20, 20, 20, 0.96)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(124, 58, 237, 0.35)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55)',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(116, 116, 128, 0.5)',
                borderRadius: 3,
              },
            },
          },
        }}
      >
        {showOffline
          ? offlineItems.map((item) => (
              <OfflineMenuItem
                key={`${item.animeId}-${item.episodeId}`}
                item={item}
                onSelect={handleSelectOffline}
              />
            ))
          : bookmarks.map((bookmark) => (
              <BookmarkMenuItem
                key={bookmark.animeSlugUrl}
                bookmark={bookmark}
                onSelect={handleSelect}
              />
            ))}
      </Menu>
    </>
  );
}

export default ContinueWatchingButton;
