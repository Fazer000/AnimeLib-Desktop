import React from 'react';
import { Box, Typography } from '@mui/material';
import { AnimeInfo } from '../../api/animeApi';
import {
  PLAYER_INFO_MAX_WIDTH,
  PLAYER_INFO_TOP,
  PLAYER_META_FONT,
  PLAYER_SUBTITLE_FONT,
  PLAYER_TITLE_FONT,
} from '../../../constants';

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

  const releaseYear = new Date(animeInfo.releaseDate).getFullYear();
  const metaText = [
    animeInfo.rating?.averageFormated,
    Number.isFinite(releaseYear) ? releaseYear : null,
    animeInfo.items_count?.total ? `${animeInfo.items_count.total} эп.` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <Box
      sx={{
        position: 'absolute',
        top: PLAYER_INFO_TOP,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        maxWidth: PLAYER_INFO_MAX_WIDTH,
        textAlign: 'center',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: 'white',
          fontWeight: 600,
          fontSize: PLAYER_TITLE_FONT,
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          mb: 1,
        }}
      >
        {animeInfo.rus_name || animeInfo.name}
      </Typography>

      {(episodeNumber || selectedPlayer) && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: PLAYER_SUBTITLE_FONT,
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

      {metaText && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: PLAYER_META_FONT,
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          }}
        >
          {metaText}
        </Typography>
      )}
    </Box>
  );
}

export default AnimeInfoComponent;
