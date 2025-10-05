import React from 'react';
import { Box, IconButton, Slider, Tooltip, Fade } from '@mui/material';
import { VolumeUpRounded, VolumeOffRounded } from '@mui/icons-material';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  showTooltip: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

/**
 * Управление громкостью видеоплеера
 */
function VolumeControl({
  volume,
  isMuted,
  showTooltip,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const vol = Array.isArray(newValue) ? newValue[0] : newValue;
    onVolumeChange(vol);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        position: 'relative',
      }}
    >
      {/* Плашка с процентом громкости */}
      <Fade in={showTooltip} timeout={{ enter: 50, exit: 60 }}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 50,
            left: '63%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(41, 41, 41, 0.62)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: 1,
            fontSize: '12px',
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 600,
            zIndex: 2001,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap',
          }}
        >
          {isMuted || volume === 0 ? '0%' : `${Math.round(volume * 100)}%`}
        </Box>
      </Fade>

      {/* Кнопка mute */}
      <Tooltip title={isMuted ? 'Включить звук' : 'Выключить звук'}>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          sx={{
            color: 'white',
            padding: 0.25,
            borderRadius: 2,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'scale(1.1)',
              color: '#7C3AED',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isMuted || volume === 0 ? (
            <VolumeOffRounded fontSize="small" />
          ) : (
            <VolumeUpRounded fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      {/* Слайдер громкости */}
      <Box
        sx={{
          width: 60,
          justifyContent: 'center',
          display: 'flex',
          alignItems: 'center',
          mr: 1,
        }}
      >
        <Slider
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.01}
          size="small"
          sx={{
            color: '#7C3AED',
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              backgroundColor: '#7C3AED',
              border: '2px solid white',
              borderRadius: '50%',
              '&:hover': {
                width: 14,
                height: 14,
                boxShadow: 'none',
              },
              transition: 'all 0.2s ease',
            },
            '& .MuiSlider-track': {
              height: 3,
              background: 'linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)',
              borderRadius: 2,
            },
            '& .MuiSlider-rail': {
              height: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
            },
          }}
        />
      </Box>
    </Box>
  );
}

export default VolumeControl;
