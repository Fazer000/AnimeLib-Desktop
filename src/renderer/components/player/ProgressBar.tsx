import React from 'react';
import { Box, Slider } from '@mui/material';
import {
  formatTime,
  calculateProgressPercent,
  calculateBufferedPercent,
} from '../../utils/videoHelpers';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  hoverTime: number | null;
  onSeek: (time: number) => void;
  onProgressMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgressMouseLeave: () => void;
}

/**
 * Прогресс бар видеоплеера
 */
function ProgressBar({
  currentTime,
  duration,
  buffered,
  hoverTime,
  onSeek,
  onProgressMouseMove,
  onProgressMouseLeave,
}: ProgressBarProps) {
  const progressPercent = calculateProgressPercent(currentTime, duration);
  const bufferedPercent = calculateBufferedPercent(buffered, duration);

  return (
    <Box
      sx={{
        position: 'relative',
        px: 0.5,
        height: 20,
      }}
    >
      {/* Визуальные полоски */}
      <Box
        sx={{
          position: 'absolute',
          top: 7,
          left: 4,
          right: 4,
          height: 6,
        }}
      >
        {/* Фон */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
          }}
        />

        {/* Буферизация */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 6,
            width: `${bufferedPercent}%`,
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            borderRadius: 3,
          }}
        />

        {/* Прогресс */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 6,
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)',
            borderRadius: 3,
          }}
        />
      </Box>

      {/* Слайдер для взаимодействия */}
      <Slider
        value={duration > 0 ? currentTime : 0}
        min={0}
        max={duration || 100}
        step={0.1}
        onChange={(event: Event, value: number | number[]) => {
          const time = Array.isArray(value) ? value[0] : value;
          onProgressMouseMove({
            currentTarget: {
              getBoundingClientRect: () => ({
                left: 0,
                width: duration,
              }),
            },
            clientX: time,
          } as any);
        }}
        onChangeCommitted={(
          event: Event | React.SyntheticEvent,
          value: number | number[],
        ) => {
          const time = Array.isArray(value) ? value[0] : value;
          onSeek(time);
          onProgressMouseLeave();
        }}
        onMouseMove={(event: React.MouseEvent) => {
          if (duration > 0) {
            const rect = (
              event.currentTarget as HTMLElement
            ).getBoundingClientRect();
            onProgressMouseMove({
              currentTarget: {
                getBoundingClientRect: () => rect,
              },
              clientX: event.clientX,
            } as any);
          }
        }}
        onMouseLeave={onProgressMouseLeave}
        sx={{
          color: '#7C3AED',
          height: 20,
          padding: '0 !important',
          '& .MuiSlider-track': {
            display: 'none',
          },
          '& .MuiSlider-rail': {
            display: 'none',
          },
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            backgroundColor: '#BB86FC',
            border: '2px solid white',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            '&:hover, &.Mui-active': {
              opacity: 1,
              width: 16,
              height: 16,
              boxShadow: '0 0 0 8px rgba(124, 58, 237, 0.16)',
            },
          },
          '&:hover .MuiSlider-thumb': {
            opacity: 1,
          },
        }}
      />

      {/* Tooltip с временем при наведении */}
      {hoverTime !== null && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: `${(hoverTime / duration) * 100}%`,
            transform: 'translateX(-50%)',
            color: '#bfbfbf',
            padding: '4px 8px',
            backgroundColor: 'rgba(41, 41, 41, 0.62)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 1,
            fontSize: '11px',
            fontFamily: 'Open Sans, sans-serif',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 2001,
            pointerEvents: 'none',
          }}
        >
          {formatTime(hoverTime)}
        </Box>
      )}
    </Box>
  );
}

export default ProgressBar;
