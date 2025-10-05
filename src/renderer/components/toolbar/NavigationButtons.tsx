/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box } from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Refresh,
  Home,
  PlayArrow,
  Pause,
} from '@mui/icons-material';

interface NavigationButtonsProps {
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  showPlayButton?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

/**
 * NavigationButtons - Navigation controls for webview/player
 *
 * Features:
 * - Back/Forward navigation
 * - Refresh
 * - Home
 * - Play/Pause (optional)
 */
function NavigationButtons({
  onBack,
  onForward,
  onRefresh,
  onHome,
  canGoBack = false,
  canGoForward = false,
  showPlayButton = false,
  isPlaying = false,
  onPlayPause,
}: NavigationButtonsProps) {
  const buttonStyle = {
    color: '#ffffff',
    WebkitAppRegion: 'no-drag' as const,
    appRegion: 'no-drag' as const,
    padding: 0.5,
    minWidth: 24,
    height: 24,
  };

  return (
    <>
      {/* Back button */}
      {onBack && (
        <IconButton
          size="small"
          onClick={onBack}
          disabled={!canGoBack}
          sx={buttonStyle}
        >
          <ArrowBack sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Draggable spacer */}
      <Box
        sx={{
          width: 8,
          height: '100%',
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
        }}
      />

      {/* Play/Pause button (optional) */}
      {showPlayButton && onPlayPause && (
        <IconButton
          size="small"
          onClick={onPlayPause}
          sx={{
            ...buttonStyle,
            color: '#7C3AED',
            marginLeft: 1,
          }}
        >
          {isPlaying ? (
            <Pause sx={{ fontSize: 16 }} />
          ) : (
            <PlayArrow sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      )}

      {/* Forward button */}
      {onForward && (
        <IconButton
          size="small"
          onClick={onForward}
          disabled={!canGoForward}
          sx={buttonStyle}
        >
          <ArrowForward sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Refresh button */}
      {onRefresh && (
        <IconButton size="small" onClick={onRefresh} sx={buttonStyle}>
          <Refresh sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Home button */}
      {onHome && (
        <IconButton size="small" onClick={onHome} sx={buttonStyle}>
          <Home sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Draggable spacer */}
      <Box
        sx={{
          width: 8,
          height: '100%',
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
        }}
      />
    </>
  );
}

export default NavigationButtons;
