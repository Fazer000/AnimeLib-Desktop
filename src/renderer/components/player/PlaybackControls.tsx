import React, { useEffect, useRef } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { PlayArrowRounded, PauseRounded } from '@mui/icons-material';
import KeyboardDoubleArrowRightRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import ControlTooltip from './ControlTooltip';
import { formatTime } from '../../utils/videoHelpers';
import { PlaybackTimeStore } from '../../services/player';
import { PLAYER_CONTROL_ICON_SIZE } from '../../../constants';
import { ACCENT, TEXT_PRIMARY } from '../../theme/palette';

const ICON_SX = { fontSize: `${PLAYER_CONTROL_ICON_SIZE}px` };

const TIME_SX = {
  color: 'white',
  fontSize: '12px',
  fontFamily: 'Open Sans, sans-serif',
};

const DURATION_SX = {
  color: TEXT_PRIMARY,
  fontSize: '12px',
  fontFamily: 'Open Sans, sans-serif',
};

/** Текущее время: пишется в textContent, поэтому тик не перерисовывает панель. */
function CurrentTime({ timeStore }: { timeStore: PlaybackTimeStore }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const render = (time: number) => {
      const text = formatTime(time);
      if (ref.current && ref.current.textContent !== text) {
        ref.current.textContent = text;
      }
    };

    render(timeStore.getCurrentTime());
    return timeStore.subscribe(render);
  }, [timeStore]);

  return <Typography ref={ref} variant="caption" sx={TIME_SX} />;
}

interface PlaybackControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  timeStore: PlaybackTimeStore;
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
  timeStore,
  duration,
  skipTime,
  onTogglePlay,
  onSkipForward,
}: PlaybackControlsProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            color: ACCENT,
          },
          transition: 'all 0.2s ease',
        }}
      >
        {isPlaying ? (
          <PauseRounded sx={ICON_SX} />
        ) : (
          <PlayArrowRounded sx={ICON_SX} />
        )}
      </IconButton>

      <ControlTooltip
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
                color: ACCENT,
              },
              transition: 'all 0.2s ease',
            }}
          >
            <KeyboardDoubleArrowRightRoundedIcon sx={ICON_SX} />
          </IconButton>
        </span>
      </ControlTooltip>

      <CurrentTime timeStore={timeStore} />
      <Typography variant="caption" sx={TIME_SX}>
        /
      </Typography>
      <Typography variant="caption" sx={DURATION_SX}>
        {formatTime(duration)}
      </Typography>
    </Box>
  );
}

export default PlaybackControls;
