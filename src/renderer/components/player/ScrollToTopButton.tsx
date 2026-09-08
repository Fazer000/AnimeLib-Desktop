import React, { useState, useEffect, useCallback } from 'react';
import { Box, Fab, Zoom, useTheme } from '@mui/material';
import { ChevronUp } from '../icons';

import { createLogger } from '../../../shared/logger';

const log = createLogger('ScrollToTopButton');

interface ScrollToTopButtonProps {
  threshold?: number;
  scrollContainerId?: string;
}

/**
 * Кнопка для прокрутки страницы вверх
 * Появляется когда пользователь прокрутил страницу вниз
 */
function ScrollToTopButton({
  threshold = 300,
  scrollContainerId,
}: ScrollToTopButtonProps) {
  const { customColors } = useTheme().palette;
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : window;

    if (!scrollContainer) {
      // eslint-disable-next-line no-console
      log.warn('Scroll container not found:', scrollContainerId);
      return undefined;
    }

    const handleScroll = () => {
      const scrolled =
        scrollContainer === window
          ? window.scrollY > threshold
          : (scrollContainer as HTMLElement).scrollTop > threshold;
      setShowButton(scrolled);
    };

    scrollContainer.addEventListener('scroll', handleScroll, {
      passive: true,
    } as any);

    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll as any);
    };
  }, [threshold, scrollContainerId]);

  const scrollToTop = useCallback(() => {
    const scrollContainer = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : window;

    if (!scrollContainer) {
      return;
    }

    if (scrollContainer === window) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } else {
      (scrollContainer as HTMLElement).scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [scrollContainerId]);

  return (
    <Zoom in={showButton}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1100,
        }}
      >
        <Fab
          onClick={scrollToTop}
          size="medium"
          sx={{
            backgroundColor: `rgba(${customColors.overlayRgb}, 0.85)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid rgba(${customColors.neutralRgb}, 0.33)`,
            color: customColors.dialogTextColor,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: `rgba(${customColors.neutralRgb}, 0.4)`,
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
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

ScrollToTopButton.defaultProps = {
  threshold: 300,
  scrollContainerId: undefined,
};

export default ScrollToTopButton;
