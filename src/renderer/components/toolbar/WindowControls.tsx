/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box, Tooltip, Typography } from '@mui/material';
import { Remove, Fullscreen, Close } from '@mui/icons-material';
import UpdateButton from './UpdateButton';
import { APP_NAME, APP_VERSION } from '../../../constants';
import { WHITE } from '../../theme/palette';

interface WindowControlsProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

/**
 * WindowControls - Window management buttons
 *
 * Features:
 * - Minimize window
 * - Maximize/restore window
 * - Close window
 */
function WindowControls({
  onMinimize,
  onMaximize,
  onClose,
}: WindowControlsProps) {
  const buttonStyle = {
    color: WHITE,
    WebkitAppRegion: 'no-drag' as const,
    appRegion: 'no-drag' as const,
    padding: 0.5,
    minWidth: 28,
    height: 28,
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <UpdateButton />

      <Tooltip title={`${APP_NAME} v${APP_VERSION}`} arrow>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.6)',
            userSelect: 'none',
            cursor: 'default',
            '&:hover': {
              color: 'rgba(255, 255, 255, 0.9)',
            },
          }}
        >
          v{APP_VERSION}
        </Typography>
      </Tooltip>

      {onMinimize && (
        <IconButton size="small" onClick={onMinimize} sx={buttonStyle}>
          <Remove sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {onMaximize && (
        <IconButton size="small" onClick={onMaximize} sx={buttonStyle}>
          <Fullscreen sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {onClose && (
        <IconButton size="small" onClick={onClose} sx={buttonStyle}>
          <Close sx={{ fontSize: 20 }} />
        </IconButton>
      )}
    </Box>
  );
}

export default WindowControls;
