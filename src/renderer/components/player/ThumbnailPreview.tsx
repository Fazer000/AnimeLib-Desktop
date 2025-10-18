import React, { useState, useEffect, memo, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface ThumbnailPreviewProps {
  thumbnailUrl: string | null;
  time: number;
  isLoading: boolean;
  position: { x: string | number; y: number };
}

/**
 * ThumbnailPreview - компонент для отображения превью кадра над прогресс-баром
 */
const ThumbnailPreview = memo(
  ({ thumbnailUrl, time, isLoading, position }: ThumbnailPreviewProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({
      left: position.x,
      transform: 'translateX(-50%)',
    });

    useEffect(() => {
      // Плавное появление
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }, []);

    // Корректировка позиции чтобы не выходить за края
    useEffect(() => {
      if (!previewRef.current) return;

      const previewElement = previewRef.current;
      const previewWidth = 160; // Ширина превью из стилей
      const padding = 12; // Отступ от края

      // Получаем позицию X в пикселях
      let xPosition: number;
      if (typeof position.x === 'string') {
        // Если это строка (например "50%"), парсим её
        const match = position.x.match(/(\d+)/);
        if (match) {
          const percent = parseInt(match[1], 10);
          const containerWidth = previewElement.parentElement?.offsetWidth || 0;
          xPosition = (containerWidth * percent) / 100;
        } else {
          xPosition = 0;
        }
      } else {
        xPosition = position.x;
      }

      const containerWidth = previewElement.parentElement?.offsetWidth || 0;
      const halfWidth = previewWidth / 2;

      let newLeft = position.x;
      let newTransform = 'translateX(-50%)';

      // Проверка левого края
      if (xPosition - halfWidth < padding) {
        newLeft = padding;
        newTransform = 'translateX(0)';
      }
      // Проверка правого края
      else if (xPosition + halfWidth > containerWidth - padding) {
        newLeft = containerWidth - padding;
        newTransform = 'translateX(-100%)';
      }

      setAdjustedPosition({
        left: newLeft,
        transform: newTransform,
      });
    }, [position.x]);

    const formatTime = (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);

      if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <Box
        ref={previewRef}
        sx={{
          position: 'absolute',
          left: adjustedPosition.left,
          bottom: position.y,
          transform: adjustedPosition.transform,
          zIndex: 1500,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.15s ease-in-out',
          pointerEvents: 'none',
        }}
      >
        {/* Превью кадра */}
        <Box
          sx={{
            position: 'relative',
            backgroundColor: '#1a1a1a',
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
            border: '2px solid rgba(124, 58, 237, 0.3)',
          }}
        >
          {/* Время */}
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderRadius: '6px',
              padding: '4px 8px',
              zIndex: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'white',
                fontFamily: 'monospace',
              }}
            >
              {formatTime(time)}
            </Typography>
          </Box>

          {/* Превью изображение */}
          {isLoading && (
            <Box
              sx={{
                width: 160,
                height: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2a2a2a',
              }}
            >
              <CircularProgress size={24} sx={{ color: '#7C3AED' }} />
            </Box>
          )}

          {!isLoading && thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Preview"
              style={{
                width: 160,
                height: 90,
                display: 'block',
                objectFit: 'cover',
              }}
            />
          )}

          {!isLoading && !thumbnailUrl && (
            <Box
              sx={{
                width: 160,
                height: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2a2a2a',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                Нет превью
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  },
);

ThumbnailPreview.displayName = 'ThumbnailPreview';

export default ThumbnailPreview;
