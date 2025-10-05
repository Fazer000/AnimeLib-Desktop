/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box } from '@mui/material';
import { Remove, Fullscreen, Close } from '@mui/icons-material';

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
    color: '#ffffff',
    WebkitAppRegion: 'no-drag' as const,
    appRegion: 'no-drag' as const,
    padding: 0.5,
    minWidth: 24,
    height: 24,
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', marginLeft: 1 }}>
      {onMinimize && (
        <IconButton size="small" onClick={onMinimize} sx={buttonStyle}>
          <Remove sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {onMaximize && (
        <IconButton size="small" onClick={onMaximize} sx={buttonStyle}>
          <Fullscreen sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {onClose && (
        <IconButton size="small" onClick={onClose} sx={buttonStyle}>
          <Close sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
}

export default WindowControls;
