import React, { useEffect, useRef, memo } from 'react';
import { Box } from '@mui/material';
import { AmbientLightManager } from '../../services/player';
import {
  AMBIENT_FADE_MS,
  AMBIENT_IDLE_OPACITY,
  AMBIENT_OPACITY,
  AMBIENT_SOURCE_HEIGHT,
  AMBIENT_SOURCE_MARGIN,
  AMBIENT_SOURCE_WIDTH,
} from '../../../constants';
import { getOverscanBox } from '../../utils/ambientFrame';

interface AmbientLightProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  isPlaying: boolean;
  isFullscreen: boolean;
  enabled: boolean;
}

const OVERSCAN = getOverscanBox(
  AMBIENT_SOURCE_WIDTH,
  AMBIENT_SOURCE_HEIGHT,
  AMBIENT_SOURCE_MARGIN,
);

const CANVAS_SX = {
  position: 'absolute' as const,
  ...OVERSCAN,
  opacity: AMBIENT_OPACITY,
};

/**
 * Подсветка по краям видео: кадр отражается в буфер 64×36,
 * а свечение даёт растяжение битмапа средствами композитора
 */
const AmbientLight = memo(
  ({ videoRef, isPlaying, isFullscreen, enabled }: AmbientLightProps) => {
    const managerRef = useRef<AmbientLightManager | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const hidden = isFullscreen || !enabled;

    useEffect(() => {
      if (hidden || !canvasRef.current) {
        return undefined;
      }

      const manager = new AmbientLightManager();
      manager.attach(canvasRef.current);
      managerRef.current = manager;

      return () => {
        manager.dispose();
        managerRef.current = null;
      };
    }, [hidden]);

    useEffect(() => {
      const video = videoRef.current;
      const manager = managerRef.current;

      if (!video || !manager || hidden) {
        manager?.stop();
        manager?.reset();
        return undefined;
      }

      manager.start(video, isPlaying);

      return () => manager.stop();
    }, [videoRef, isPlaying, hidden]);

    if (hidden) {
      return null;
    }

    return (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: -1,
          opacity: isPlaying ? 1 : AMBIENT_IDLE_OPACITY,
          transition: `opacity ${AMBIENT_FADE_MS}ms ease`,
          mixBlendMode: 'screen',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
        }}
      >
        <Box component="canvas" ref={canvasRef} sx={CANVAS_SX} />
      </Box>
    );
  },
);

AmbientLight.displayName = 'AmbientLight';

export default AmbientLight;
