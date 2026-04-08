import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Box } from '@mui/material';
import { AmbientLightManager } from '../../services/player';

interface AmbientLightProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  isPlaying: boolean;
  isFullscreen: boolean;
  enabled: boolean;
}

const AmbientLight = memo(
  ({ videoRef, isPlaying, isFullscreen, enabled }: AmbientLightProps) => {
    const managerRef = useRef<AmbientLightManager | null>(null);
    const [dominantColors, setDominantColors] = useState<{
      top: string;
      bottom: string;
      left: string;
      right: string;
    }>({
      top: 'rgba(0, 0, 0, 0)',
      bottom: 'rgba(0, 0, 0, 0)',
      left: 'rgba(0, 0, 0, 0)',
      right: 'rgba(0, 0, 0, 0)',
    });

    useEffect(() => {
      if (!managerRef.current) {
        managerRef.current = new AmbientLightManager();
        managerRef.current.setOnColorsUpdate((colors) => {
          setDominantColors(colors);
        });
      }

      return () => {
        if (managerRef.current) {
          managerRef.current.dispose();
          managerRef.current = null;
        }
      };
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      const manager = managerRef.current;

      if (!video || !manager || isFullscreen || !enabled) {
        if (manager) {
          manager.stop();
          manager.reset();
        }
        return undefined;
      }

      manager.start(video, isPlaying);

      return () => {
        if (manager) {
          manager.stop();
        }
      };
    }, [videoRef, isPlaying, isFullscreen, enabled]);

    const gradientStyles = useMemo(() => {
      const colorTop = dominantColors.top || 'rgba(0, 0, 0, 0)';
      const colorBottom = dominantColors.bottom || 'rgba(0, 0, 0, 0)';
      const colorLeft = dominantColors.left || 'rgba(0, 0, 0, 0)';
      const colorRight = dominantColors.right || 'rgba(0, 0, 0, 0)';

      const createSmoothGradient = (color: string, steps: number) => {
        const points: string[] = [];
        for (let i = 0; i <= steps; i += 1) {
          const position = (i / steps) * 100;
          const opacity = (1 - i / steps) ** 2.5;
          const newColor = color.replace(/[\d.]+\)$/, `${opacity.toFixed(3)})`);
          points.push(`${newColor} ${position.toFixed(1)}%`);
        }
        return points.join(', ');
      };

      return {
        top: {
          background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${createSmoothGradient(colorTop, 8)})`,
          filter: 'blur(60px)',
          opacity: 0.6,
          transition: 'background 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        bottom: {
          background: `radial-gradient(ellipse 120% 80% at 50% 100%, ${createSmoothGradient(colorBottom, 8)})`,
          filter: 'blur(60px)',
          opacity: 0.65,
          transition: 'background 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        left: {
          background: `linear-gradient(to right, ${createSmoothGradient(colorLeft, 8)})`,
          filter: 'blur(50px)',
          opacity: 0.6,
          transition: 'background 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        right: {
          background: `linear-gradient(to left, ${createSmoothGradient(colorRight, 8)})`,
          filter: 'blur(50px)',
          opacity: 0.6,
          transition: 'background 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      };
    }, [dominantColors]);

    if (isFullscreen || !enabled) {
      return null;
    }

    return (
      <>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: -1,
            opacity: isPlaying ? 1 : 0.3,
            transition: 'opacity 0.8s ease',
            overflow: 'visible',
            mixBlendMode: 'screen',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '300px',
              ...gradientStyles.top,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '350px',
              ...gradientStyles.bottom,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '40%',
              ...gradientStyles.left,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '40%',
              ...gradientStyles.right,
            }}
          />
        </Box>
      </>
    );
  },
);

AmbientLight.displayName = 'AmbientLight';

export default AmbientLight;
