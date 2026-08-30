import React, { useEffect, useRef, memo } from 'react';
import { Box } from '@mui/material';
import { AmbientLightManager } from '../../services/player';
import type { AmbientColor, AmbientColors } from '../../services/player';

interface AmbientLightProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  isPlaying: boolean;
  isFullscreen: boolean;
  enabled: boolean;
}

const GRADIENT_STEPS = 8;

const BASE_SX = {
  position: 'absolute' as const,
  transition: 'background 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
};

const TOP_SX = {
  ...BASE_SX,
  top: 0,
  left: 0,
  right: 0,
  height: '300px',
  filter: 'blur(60px)',
  opacity: 0.6,
};

const BOTTOM_SX = {
  ...BASE_SX,
  bottom: 0,
  left: 0,
  right: 0,
  height: '350px',
  filter: 'blur(60px)',
  opacity: 0.65,
};

const LEFT_SX = {
  ...BASE_SX,
  top: 0,
  bottom: 0,
  left: 0,
  width: '40%',
  filter: 'blur(50px)',
  opacity: 0.6,
};

const RIGHT_SX = {
  ...BASE_SX,
  top: 0,
  bottom: 0,
  right: 0,
  width: '40%',
  filter: 'blur(50px)',
  opacity: 0.6,
};

/** Растягивает цвет в многоступенчатый градиент с квадратичным спадом прозрачности. */
const buildStops = (color: AmbientColor): string => {
  const points: string[] = [];

  for (let i = 0; i <= GRADIENT_STEPS; i += 1) {
    const position = (i / GRADIENT_STEPS) * 100;
    const opacity = (1 - i / GRADIENT_STEPS) ** 2.5;
    points.push(
      `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity.toFixed(3)}) ${position.toFixed(1)}%`,
    );
  }

  return points.join(', ');
};

/**
 * Подсветка по краям видео. Цвета пишутся напрямую в style, минуя состояние React,
 * чтобы обновления десять раз в секунду не перерисовывали дерево.
 */
const AmbientLight = memo(
  ({ videoRef, isPlaying, isFullscreen, enabled }: AmbientLightProps) => {
    const managerRef = useRef<AmbientLightManager | null>(null);
    const topRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const leftRef = useRef<HTMLDivElement | null>(null);
    const rightRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const manager = new AmbientLightManager();
      managerRef.current = manager;

      manager.setOnColorsUpdate((colors: AmbientColors) => {
        if (topRef.current) {
          topRef.current.style.background = `radial-gradient(ellipse 120% 80% at 50% 0%, ${buildStops(colors.top)})`;
        }
        if (bottomRef.current) {
          bottomRef.current.style.background = `radial-gradient(ellipse 120% 80% at 50% 100%, ${buildStops(colors.bottom)})`;
        }
        if (leftRef.current) {
          leftRef.current.style.background = `linear-gradient(to right, ${buildStops(colors.left)})`;
        }
        if (rightRef.current) {
          rightRef.current.style.background = `linear-gradient(to left, ${buildStops(colors.right)})`;
        }
      });

      return () => {
        manager.dispose();
        managerRef.current = null;
      };
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      const manager = managerRef.current;

      if (!video || !manager || isFullscreen || !enabled) {
        manager?.stop();
        manager?.reset();
        return undefined;
      }

      manager.start(video, isPlaying);

      return () => manager.stop();
    }, [videoRef, isPlaying, isFullscreen, enabled]);

    if (isFullscreen || !enabled) {
      return null;
    }

    return (
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
        <Box ref={topRef} sx={TOP_SX} />
        <Box ref={bottomRef} sx={BOTTOM_SX} />
        <Box ref={leftRef} sx={LEFT_SX} />
        <Box ref={rightRef} sx={RIGHT_SX} />
      </Box>
    );
  },
);

AmbientLight.displayName = 'AmbientLight';

export default AmbientLight;
