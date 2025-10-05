import React from 'react';
import { Box, Button, Typography } from '@mui/material';

interface Episode {
  id: number;
  number: string;
  name: string;
}

interface EpisodeCarouselProps {
  episodes: Episode[];
  currentEpisodeIndex: number;
  showEpisodes: boolean;
  onEpisodeSelect: (index: number) => void;
  onMenuOpenChange: (isOpen: boolean) => void;
}

/**
 * Карусель эпизодов в fullscreen режиме
 */
function EpisodeCarousel({
  episodes,
  currentEpisodeIndex,
  showEpisodes,
  onEpisodeSelect,
  onMenuOpenChange,
}: EpisodeCarouselProps) {
  if (!episodes || episodes.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: showEpisodes ? 'translateY(0)' : 'translateY(100%)',
        opacity: showEpisodes ? 1 : 0,
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        padding: '12px 12px',
        maxHeight: '80px',
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        gap: 1.25,
        alignItems: 'center',
        background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.4))',
        zIndex: 999,
        '&::-webkit-scrollbar': {
          height: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '2px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.5)',
          },
        },
      }}
    >
      {episodes.map((episode, index) => {
        const isSelected = index === currentEpisodeIndex;
        return (
          <Button
            key={episode.id}
            onClick={(e) => {
              e.stopPropagation();
              onEpisodeSelect(index);
              onMenuOpenChange(false);
            }}
            sx={{
              minWidth: '80px',
              padding: '8px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              flex: episodes.length > 6 ? '1' : 'none',
              backgroundColor: isSelected
                ? 'rgba(116, 116, 128, .1)'
                : 'rgba(116, 116, 128, .1)',
              border: isSelected
                ? '1px solid #7C3AED'
                : '1px solid rgba(116, 116, 128, 0.33)',
              color: isSelected ? '#7C3AED' : '#fff',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.84rem',
                fontWeight: isSelected ? 600 : 400,
                display: 'block',
                textTransform: 'none',
              }}
            >
              {episode.number} эпизод
            </Typography>
          </Button>
        );
      })}
    </Box>
  );
}

export default EpisodeCarousel;
