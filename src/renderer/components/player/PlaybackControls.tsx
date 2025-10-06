import React from 'react';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import { PlayArrowRounded, PauseRounded } from '@mui/icons-material';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import { formatTime } from '../../utils/videoHelpers';

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  skipTime: number;
  onTogglePlay: () => void;
  onSkipForward: (seconds: number) => void;
}

/**
 * Кнопки управления воспроизведением
 */
function PlaybackControls({
  isPlaying,
  isLoading,
  currentTime,
  duration,
  skipTime,
  onTogglePlay,
  onSkipForward,
}: PlaybackControlsProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Play/Pause */}
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay();
        }}
        sx={{
          color: 'white',
          padding: 0.5,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            transform: 'scale(1.1)',
            color: '#7C3AED',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {isPlaying ? (
          <PauseRounded fontSize="small" />
        ) : (
          <PlayArrowRounded fontSize="small" />
        )}
      </IconButton>

      {/* Skip Forward */}
      <Tooltip
        title={`Перемотать на ${Math.floor(skipTime / 60)} мин ${skipTime % 60} сек`}
      >
        <span>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onSkipForward(skipTime);
            }}
            disabled={isLoading}
            sx={{
              color: 'white',
              padding: 0.5,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.1)',
                color: '#7C3AED',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <KeyboardDoubleArrowRightRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Time Display */}
      <Typography
        variant="caption"
        sx={{
          color: 'white',
          fontSize: '12px',
          fontFamily: 'Open Sans, sans-serif',
        }}
      >
        {formatTime(currentTime)}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'white',
          fontSize: '12px',
          fontFamily: 'Open Sans, sans-serif',
        }}
      >
        /
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: '#bfbfbf',
          fontSize: '12px',
          fontFamily: 'Open Sans, sans-serif',
        }}
      >
        {formatTime(duration)}
      </Typography>
    </Box>
  );
}

export default PlaybackControls;
