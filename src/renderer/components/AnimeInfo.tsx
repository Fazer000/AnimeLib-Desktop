import React from 'react';
import { Box, Typography } from '@mui/material';
import { AnimeInfo } from '../api/animeApi';

interface AnimeInfoProps {
  animeInfo: AnimeInfo | null;
  show: boolean;
  episodeName: string;
}

function AnimeInfoComponent({ animeInfo, show, episodeName }: AnimeInfoProps) {
  if (!animeInfo) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1001,
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
          fontSize: '1rem',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          mb: 0.5,
        }}
      >
        {animeInfo.rus_name || animeInfo.name}
      </Typography>

      {/* Название эпизода */}
      {episodeName && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.9rem',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            mb: 0.5,
            fontStyle: 'italic',
          }}
        >
          {episodeName}
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
