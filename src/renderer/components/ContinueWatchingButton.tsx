import React, { useState } from 'react';
import { Box, Fab, Zoom, Menu, MenuItem, ListItemText } from '@mui/material';
import { BookmarkRounded } from '@mui/icons-material';
import { BookmarkItem } from '../api/animeApi';
import useImageWithReferer from '../hooks/useImageWithReferer';

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

interface ContinueWatchingButtonProps {
  bookmarks: BookmarkItem[];
  onSelect: (bookmark: BookmarkItem) => void;
}

/**
 * Плавающая кнопка со списком закладок «Смотрю»
 */
function ContinueWatchingButton({
  bookmarks,
  onSelect,
}: ContinueWatchingButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleSelect = (bookmark: BookmarkItem) => {
    setAnchorEl(null);
    onSelect(bookmark);
  };

  return (
    <>
      <Zoom in={bookmarks.length > 0}>
        <Box
          sx={{
            position: 'fixed',
            bottom: 88,
            left: 24,
            zIndex: 1200,
          }}
        >
          <Fab
            onClick={(event) => setAnchorEl(event.currentTarget)}
            size="medium"
            sx={{
              backgroundColor: anchorEl
                ? 'rgba(124, 58, 237, 0.28)'
                : 'rgba(20, 20, 20, 0.9)',
              backdropFilter: 'blur(10px)',
              border: anchorEl
                ? '1px solid rgba(124, 58, 237, 0.6)'
                : '1px solid rgba(116, 116, 128, 0.33)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: anchorEl
                  ? 'rgba(124, 58, 237, 0.35)'
                  : 'rgba(116, 116, 128, 0.4)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
              },
            }}
          >
            <BookmarkRounded sx={{ fontSize: 24, color: '#7C3AED' }} />
          </Fab>
        </Box>
      </Zoom>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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
              transformOrigin: 'left bottom !important',
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
        {bookmarks.map((bookmark) => (
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
