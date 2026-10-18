import React from 'react';
import { Box, Fab, Zoom, alpha, useTheme } from '@mui/material';
import { ChevronUp } from './icons';
import { SCROLL_TOP_BUTTON_MARGIN } from '../../constants';

interface ScrollTopFabProps {
  visible: boolean;
  onClick: () => void;
  // eslint-disable-next-line react/require-default-props
  position?: 'fixed' | 'absolute';
  // eslint-disable-next-line react/require-default-props
  right?: number;
  // eslint-disable-next-line react/require-default-props
  bottom?: number;
}

/**
 * Круглая кнопка прокрутки вверх, общая для плеера и страниц сайта
 */
function ScrollTopFab({
  visible,
  onClick,
  position = 'fixed',
  right = SCROLL_TOP_BUTTON_MARGIN,
  bottom = SCROLL_TOP_BUTTON_MARGIN,
}: ScrollTopFabProps) {
  const { customColors } = useTheme().palette;

  return (
    <Zoom in={visible}>
      <Box
        sx={{
          position,
          right,
          bottom,
          zIndex: 1100,
          transition: 'right 0.25s ease, bottom 0.25s ease',
        }}
      >
        <Fab
          onClick={onClick}
          size="medium"
          aria-label="Наверх"
          sx={{
            backgroundColor: `rgba(${customColors.overlayRgb}, 0.85)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid rgba(${customColors.neutralRgb}, 0.33)`,
            color: customColors.dialogTextColor,
            boxShadow: `0 4px 12px ${alpha(customColors.blackColor, 0.4)}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: `rgba(${customColors.neutralRgb}, 0.4)`,
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 16px ${alpha(customColors.blackColor, 0.5)}`,
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          <ChevronUp sx={{ fontSize: 28 }} />
        </Fab>
      </Box>
    </Zoom>
  );
}

export default ScrollTopFab;
