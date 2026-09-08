import React, { ReactNode } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { EMPTY_STATE_FONT_SIZE, EMPTY_STATE_ICON_SIZE } from '../../constants';

interface EmptyStateProps {
  icon: ReactNode;
  text: string;
}

/**
 * Пустое состояние вкладки: приглушённая иконка раздела и текст по центру
 */
function EmptyState({ icon, text }: EmptyStateProps) {
  const { customColors } = useTheme().palette;

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        px: 4,
        color: customColors.accentTextColor,
        '& .MuiSvgIcon-root': {
          fontSize: EMPTY_STATE_ICON_SIZE,
          opacity: 0.45,
        },
      }}
    >
      {icon}

      <Typography
        sx={{
          fontSize: EMPTY_STATE_FONT_SIZE,
          color: customColors.accentTextColor,
          textAlign: 'center',
          maxWidth: 380,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}

export default EmptyState;
