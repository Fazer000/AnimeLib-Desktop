import React from 'react';
import { Box } from '@mui/material';
import { KeyboardArrowDownRounded } from '@mui/icons-material';
import { WHITE } from '../../theme/palette';

interface AnimeInfoHandleProps {
  hidden: boolean;
}

/**
 * Язычок-подсказка, обозначающий зону вызова карточки аниме
 */
function AnimeInfoHandle({ hidden }: AnimeInfoHandleProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 46,
        height: 22,
        borderRadius: '0 0 50% 50% / 0 0 100% 100%',
        backgroundColor: 'rgba(124, 58, 237, 0.85)',
        border: '1px solid rgba(124, 58, 237, 0.5)',
        borderTop: 'none',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
        pointerEvents: 'none',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <KeyboardArrowDownRounded
        sx={{
          fontSize: 16,
          color: WHITE,
          mt: -0.25,
          animation: 'handleHint 1.8s ease-in-out infinite',
          '@keyframes handleHint': {
            '0%, 100%': { transform: 'translateY(-1px)' },
            '50%': { transform: 'translateY(2px)' },
          },
        }}
      />
    </Box>
  );
}

export default AnimeInfoHandle;
