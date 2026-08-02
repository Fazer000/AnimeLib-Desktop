import React, { useState } from 'react';
import { Box, IconButton, Slider, Tooltip, Fade } from '@mui/material';

import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeDownRoundedIcon from '@mui/icons-material/VolumeDownRounded';
import VolumeMuteRoundedIcon from '@mui/icons-material/VolumeMuteRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import { PLAYER_CONTROL_ICON_SIZE } from '../../../constants';

const ICON_SX = { fontSize: `${PLAYER_CONTROL_ICON_SIZE}px` };

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
  const [isDragging, setIsDragging] = useState(false);

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const vol = Array.isArray(newValue) ? newValue[0] : newValue;
    if (!isDragging) {
      setIsDragging(true);
    }
    onVolumeChange(vol);
  };

  const handleChangeCommitted = () => {
    setIsDragging(false);
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeOffRoundedIcon sx={ICON_SX} />;
    }
    if (volume < 0.3) {
      return <VolumeMuteRoundedIcon sx={ICON_SX} />;
    }
    if (volume < 0.7) {
      return <VolumeDownRoundedIcon sx={ICON_SX} />;
    }
    return <VolumeUpRoundedIcon sx={ICON_SX} />;
  };

  const getTooltipText = () => {
    if (isMuted) return 'Включить звук';
    if (volume === 0) return 'Включить звук';
    if (volume < 0.3) return 'Тихо';
    if (volume < 0.7) return 'Средняя громкость';
    return 'Громко';
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
            backdropFilter: 'blur(8px)',
            whiteSpace: 'nowrap',
          }}
        >
          {isMuted || volume === 0 ? '0%' : `${Math.round(volume * 100)}%`}
        </Box>
      </Fade>

      <Tooltip title={getTooltipText()} placement="top">
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          sx={{
            color: 'white',
            padding: 0.5,
            borderRadius: 2,
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'scale(1.15)',
              color: '#BB86FC',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiSvgIcon-root': {
              transition: 'all 0.2s ease',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isDragging
                ? 'pulse 0.6s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                : 'none',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.1)',
                  opacity: 0.8,
                },
              },
            }}
          >
            {getVolumeIcon()}
          </Box>
        </IconButton>
      </Tooltip>

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
          onChangeCommitted={handleChangeCommitted}
          min={0}
          max={1}
          step={0.01}
          size="small"
          sx={{
            color: '#7C3AED',
            cursor: 'pointer',
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              backgroundColor: '#fff',
              border: '2px solid #BB86FC',
              borderRadius: '50%',
              transition: isDragging
                ? 'none'
                : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: isDragging ? 'left' : 'auto',
              cursor: 'grab',
              '&:hover': {
                width: 14,
                height: 14,
              },
              '&.Mui-active': {
                width: 15,
                height: 15,
                cursor: 'grabbing',
              },
            },
            '& .MuiSlider-track': {
              height: 4,
              background: '#7C3AED',
              borderRadius: 50,
              border: 'none',
              transition: isDragging ? 'none' : 'width 0.1s ease',
              willChange: isDragging ? 'width' : 'auto',
            },
            '& .MuiSlider-rail': {
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 10,
              opacity: 1,
            },
          }}
        />
      </Box>
    </Box>
  );
}

export default VolumeControl;
