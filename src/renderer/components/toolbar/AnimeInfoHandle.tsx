import React from 'react';
import { Box, useTheme } from '@mui/material';
import { ANIME_HANDLE_HEIGHT, ANIME_HANDLE_WIDTH } from '../../../constants';

interface AnimeInfoHandleProps {
  top: number;
  hidden: boolean;
}

/**
 * Полоска на нижней границе шапки, обозначающая зону вызова карточки аниме
 */
function AnimeInfoHandle({ top, hidden }: AnimeInfoHandleProps) {
  const { customColors } = useTheme().palette;

  return (
    <Box
      sx={{
        position: 'absolute',
        top,
        left: '50%',
        transform: 'translateX(-50%)',
        width: ANIME_HANDLE_WIDTH,
        height: ANIME_HANDLE_HEIGHT,
        borderRadius: `${ANIME_HANDLE_HEIGHT}px`,
        backgroundColor: customColors.secondaryColor,
        pointerEvents: 'none',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
    />
  );
}

export default AnimeInfoHandle;
