import React from 'react';
import { Box, Typography } from '@mui/material';
import { AnimeInfo } from '../../api/animeApi';

interface AnimeInfoProps {
  animeInfo: AnimeInfo | null;
  show: boolean;
  episodeName: string;
  episodeNumber: number;
  selectedPlayer: {
    id: number;
    player: string;
    team: {
      name: string;
    };
  } | null;
}

function AnimeInfoComponent({
  animeInfo,
  show,
  episodeName,
  episodeNumber,
  selectedPlayer,
}: AnimeInfoProps) {
  if (!animeInfo) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        textAlign: 'center',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Название */}
      <Typography
        variant="h6"
        sx={{
          color: 'white',
          fontWeight: 600,
          fontSize: '1.5rem',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          mb: 1,
        }}
      >
        {animeInfo.rus_name || animeInfo.name}
      </Typography>

      {/* Эпизод и озвучка */}
      {(episodeNumber || selectedPlayer) && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '0.9rem',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            mb: 0.5,
          }}
        >
          {episodeNumber && `Эпизод ${episodeNumber}`}
          {episodeNumber && selectedPlayer && ' • '}
          {selectedPlayer && (
            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {selectedPlayer.team?.name || selectedPlayer.player}
            </span>
          )}
          {episodeName && ' • '}
          {episodeName && (
            <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {episodeName}
            </span>
          )}
        </Typography>
      )}

      {/* Информация в одну строку */}
      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '0.85rem',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
        }}
      >
        {animeInfo.rating.averageFormated} •{' '}
        {new Date(animeInfo.releaseDate).getFullYear()} •{' '}
        {animeInfo.items_count.total} эп.
      </Typography>
    </Box>
  );
}

export default AnimeInfoComponent;
