import React, { useState, useEffect, useCallback } from 'react';
import ScrollTopFab from '../ScrollTopFab';

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
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : window;

    if (!scrollContainer) {
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

  return <ScrollTopFab visible={showButton} onClick={scrollToTop} />;
}

ScrollToTopButton.defaultProps = {
  threshold: 300,
  scrollContainerId: undefined,
};

export default ScrollToTopButton;
