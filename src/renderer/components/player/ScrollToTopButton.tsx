import React, { useState, useEffect, useCallback } from 'react';
import { Box, Fab, Zoom } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';

interface ScrollToTopButtonProps {
  // Порог прокрутки для показа кнопки (в пикселях)
  threshold?: number;
}

/**
 * Кнопка для прокрутки страницы вверх
 * Появляется когда пользователь прокрутил страницу вниз
 */
function ScrollToTopButton({ threshold = 300 }: ScrollToTopButtonProps) {
  const [showButton, setShowButton] = useState(false);

  // Отслеживание прокрутки
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > threshold;
      setShowButton(scrolled);
    };

    // Добавляем слушатель
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Проверяем начальное положение
    handleScroll();

    // Очистка
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  // Прокрутка наверх
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

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
            backgroundColor: 'rgba(20, 20, 20, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(116, 116, 128, 0.33)',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: 'rgba(116, 116, 128, 0.4)',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          }}
        >
          <KeyboardArrowUp sx={{ fontSize: 28 }} />
        </Fab>
      </Box>
    </Zoom>
  );
}

ScrollToTopButton.defaultProps = {
  threshold: 300,
};

export default ScrollToTopButton;
