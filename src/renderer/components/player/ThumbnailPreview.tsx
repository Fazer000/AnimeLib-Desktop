import React, { useState, useEffect, memo } from 'react';
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

    useEffect(() => {
      // Плавное появление
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }, []);

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
        sx={{
          position: 'absolute',
          left: position.x,
          bottom: position.y,
          transform: 'translateX(-50%)',
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
              top: 4,
              right: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '4px',
              padding: '2px 6px',
              zIndex: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'white',
                fontFamily: 'monospace',
              }}
            >
              {formatTime(time)}
            </Typography>
          </Box>

          {/* Превью изображение */}
          {isLoading ? (
            <Box
              sx={{
                width: 120,
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2a2a2a',
              }}
            >
              <CircularProgress size={20} sx={{ color: '#7C3AED' }} />
            </Box>
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Preview"
              style={{
                width: 120,
                height: 68,
                display: 'block',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                width: 120,
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2a2a2a',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                Нет превью
              </Typography>
            </Box>
          )}

          {/* Треугольник указатель */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(124, 58, 237, 0.3)',
            }}
          />
        </Box>
      </Box>
    );
  },
);

ThumbnailPreview.displayName = 'ThumbnailPreview';

export default ThumbnailPreview;

