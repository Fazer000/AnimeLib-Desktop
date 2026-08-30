import React, { useState, useLayoutEffect, memo, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { ACCENT, SURFACE_DARKER, SURFACE_MUTED } from '../../theme/palette';

interface ThumbnailPreviewProps {
  thumbnailUrl: string | null;
  time: number;
  duration: number;
  isLoading: boolean;
  isApproximate: boolean;
  position: { x: string | number; y: number };
}

const ThumbnailPreview = memo(
  ({
    thumbnailUrl,
    time,
    duration,
    isLoading,
    isApproximate,
    position,
  }: ThumbnailPreviewProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState({
      left: position.x,
      transform: 'translateX(-50%)',
    });

    const PREVIEW_WIDTH = 240;
    const PREVIEW_HEIGHT = 135;

    useLayoutEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), 30);
      return () => clearTimeout(timer);
    }, []);

    useLayoutEffect(() => {
      if (!previewRef.current) return;

      const previewElement = previewRef.current;
      const padding = 12;

      let xPosition: number;
      if (typeof position.x === 'string') {
        const match = position.x.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          const percent = parseFloat(match[1]);
          const containerWidth = previewElement.parentElement?.offsetWidth || 0;
          xPosition = (containerWidth * percent) / 100;
        } else {
          xPosition = 0;
        }
      } else {
        xPosition = position.x;
      }

      const containerWidth = previewElement.parentElement?.offsetWidth || 0;
      const halfWidth = PREVIEW_WIDTH / 2;

      let newLeft: string | number = position.x;
      let newTransform = 'translateX(-50%)';

      if (xPosition - halfWidth < padding) {
        newLeft = padding;
        newTransform = 'translateX(0)';
      } else if (xPosition + halfWidth > containerWidth - padding) {
        newLeft = containerWidth - padding;
        newTransform = 'translateX(-100%)';
      }

      setAdjustedPosition((prev) => {
        if (prev.left === newLeft && prev.transform === newTransform)
          return prev;
        return { left: newLeft, transform: newTransform };
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
          transition: 'opacity 0.12s ease-in-out',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            backgroundColor: SURFACE_DARKER,
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.7)',
            border: '2px solid rgba(124, 58, 237, 0.4)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderRadius: '6px',
              padding: '3px 8px',
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

          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Preview"
              style={{
                width: PREVIEW_WIDTH,
                height: PREVIEW_HEIGHT,
                display: 'block',
                objectFit: 'cover',
                opacity: isLoading ? 0.6 : 1,
                filter: isApproximate ? 'blur(3px)' : 'none',
                transform: isApproximate ? 'scale(1.04)' : 'scale(1)',
                transition:
                  'filter 0.15s ease, transform 0.15s ease, opacity 0.1s',
              }}
            />
          )}

          {isLoading && !thumbnailUrl && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: SURFACE_MUTED,
              }}
            >
              <CircularProgress size={28} sx={{ color: ACCENT }} />
            </Box>
          )}

          {!isLoading && !thumbnailUrl && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: SURFACE_MUTED,
              }}
            >
              <Typography
                sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}
              >
                Нет превью
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              width: `${duration > 0 ? (time / duration) * 100 : 0}%`,
              backgroundColor: ACCENT,
              zIndex: 3,
              transition: 'width 0.1s ease',
            }}
          />
        </Box>
      </Box>
    );
  },
);

ThumbnailPreview.displayName = 'ThumbnailPreview';

export default ThumbnailPreview;
