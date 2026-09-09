import React from 'react';
import { Box, Slider, Typography, useTheme } from '@mui/material';
import { SECTION_LABEL_SX } from './styles';
import { SETTINGS_MENU_PADDING_X } from '../../../../constants';

interface SettingSliderProps {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  marks: Array<{ value: number; label: string }>;
  onChange: (value: number) => void;
}

/**
 * Шкала настройки с подписью текущего значения и делениями
 */
function SettingSlider({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  marks,
  onChange,
}: SettingSliderProps) {
  const { customColors } = useTheme().palette;

  return (
    <Box sx={{ px: SETTINGS_MENU_PADDING_X, pt: 1, pb: 0.25 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          mb: 0.25,
        }}
      >
        <Typography sx={SECTION_LABEL_SX}>{label}</Typography>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            color: customColors.onVideoAccentColor,
          }}
        >
          {valueLabel}
        </Typography>
      </Box>

      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        marks={marks}
        onChange={(event, next) => {
          event.stopPropagation();
          onChange(next as number);
        }}
        sx={{
          color: customColors.onVideoAccentColor,
          height: 4,
          padding: '8px 0 16px',
          '& .MuiSlider-rail': {
            opacity: 1,
            backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.16)`,
          },
          '& .MuiSlider-thumb': {
            width: 12,
            height: 12,
            '&:hover, &.Mui-focusVisible': { boxShadow: 'none' },
          },
          '& .MuiSlider-mark': {
            width: 3,
            height: 3,
            borderRadius: '50%',
            backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.4)`,
          },
          '& .MuiSlider-markLabel': {
            fontSize: '0.625rem',
            color: customColors.onVideoMutedColor,
            top: 18,
          },
        }}
      />
    </Box>
  );
}

export default SettingSlider;
