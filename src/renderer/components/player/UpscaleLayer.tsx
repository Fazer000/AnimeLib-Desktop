import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { UpscaleRenderer, UpscaleStats } from '../../services/player';
import {
  getCanvasPixelSize,
  getContainRect,
  Rect,
} from '../../utils/upscaleGeometry';
import { formatUpscaleStats } from '../../utils/upscaleStats';
import {
  UPSCALE_HUD_BOTTOM,
  UPSCALE_RESIZE_SETTLE_MS,
  UpscalePreset,
} from '../../../constants';
import { createLogger } from '../../../shared/logger';

const log = createLogger('UpscaleLayer');

const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

interface UpscaleLayerProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  preset: UpscalePreset | null;
  showStats: boolean;
  onStats: (stats: UpscaleStats) => void;
  onFailure: () => void;
}

/**
 * Слой улучшения картинки поверх кадра: холст WebGPU, черта сравнения
 * и замер нагрузки. Без уровня, WebGPU или доступа к кадрам не рисуется
 */
function UpscaleLayer({
  videoRef,
  preset,
  showStats,
  onStats,
  onFailure,
}: UpscaleLayerProps) {
  const { customColors } = useTheme().palette;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<UpscaleRenderer | null>(null);
  const [rect, setRect] = useState<Rect>(EMPTY_RECT);
  const [stats, setStats] = useState<UpscaleStats | null>(null);
  const statsHandlerRef = useRef(onStats);
  const failureHandlerRef = useRef(onFailure);
  statsHandlerRef.current = onStats;
  failureHandlerRef.current = onFailure;

  const active = preset !== null && UpscaleRenderer.isSupported();

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !canvas) return undefined;

    const renderer = new UpscaleRenderer({
      onStats: (next) => {
        setStats(next);
        statsHandlerRef.current(next);
      },
      onError: () => failureHandlerRef.current(),
    });
    rendererRef.current = renderer;

    renderer.start(video, canvas).catch((error) => {
      log.error('Upscale start failed:', error);
      failureHandlerRef.current();
    });

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      setStats(null);
    };
  }, [active, videoRef]);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!active || !container || !video) return undefined;

    const update = () =>
      setRect(
        getContainRect(
          container.clientWidth,
          container.clientHeight,
          video.videoWidth,
          video.videoHeight,
        ),
      );

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
    };
  }, [active, videoRef]);

  const sizedRef = useRef<boolean>(false);

  useEffect(() => {
    sizedRef.current = false;
  }, [active]);

  useEffect(() => {
    if (!active || !rect.width) return undefined;

    const apply = () => {
      sizedRef.current = true;
      rendererRef.current?.resize(
        getCanvasPixelSize(rect, window.devicePixelRatio),
      );
    };

    if (!sizedRef.current) {
      apply();
      return undefined;
    }

    const timer = window.setTimeout(apply, UPSCALE_RESIZE_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [active, rect]);

  useEffect(() => {
    if (preset) rendererRef.current?.setPreset(preset);
  }, [active, preset]);

  if (!active) return null;

  const tagSx = {
    px: 1,
    py: 0.25,
    borderRadius: '6px',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap' as const,
    color: customColors.onVideoColor,
    backgroundColor: `rgba(${customColors.onVideoSurfaceRgb}, 0.6)`,
  };

  return (
    <Box
      ref={containerRef}
      sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {showStats && stats && (
          <Typography
            sx={{
              ...tagSx,
              position: 'absolute',
              left: 12,
              bottom: UPSCALE_HUD_BOTTOM,
              fontFamily: 'monospace',
            }}
          >
            {formatUpscaleStats(stats)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default UpscaleLayer;
