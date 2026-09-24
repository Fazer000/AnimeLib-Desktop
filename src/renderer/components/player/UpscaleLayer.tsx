import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { ChevronsLeftRight } from '../icons';
import { UpscaleRenderer, UpscaleStats } from '../../services/player';
import {
  clampSplit,
  getCanvasPixelSize,
  getContainRect,
  Rect,
} from '../../utils/upscaleGeometry';
import { formatUpscaleStats } from '../../utils/upscaleStats';
import {
  UPSCALE_COMPARE_HIT_WIDTH,
  UPSCALE_COMPARE_KNOB_SIZE,
  UPSCALE_HUD_BOTTOM,
} from '../../../constants';
import { createLogger } from '../../../shared/logger';

const log = createLogger('UpscaleLayer');

const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

interface UpscaleLayerProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  enabled: boolean;
  compare: boolean;
}

/**
 * Опытный слой Anime4K поверх кадра: холст WebGPU, черта сравнения
 * и замер времени кадра. Без WebGPU или при ошибке чтения кадра не рисуется
 */
function UpscaleLayer({ videoRef, enabled, compare }: UpscaleLayerProps) {
  const { customColors } = useTheme().palette;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<UpscaleRenderer | null>(null);
  const [rect, setRect] = useState<Rect>(EMPTY_RECT);
  const [split, setSplit] = useState<number>(0.5);
  const [stats, setStats] = useState<UpscaleStats | null>(null);
  const [failed, setFailed] = useState<boolean>(false);

  const active = enabled && !failed && UpscaleRenderer.isSupported();

  useEffect(() => {
    if (!enabled) setFailed(false);
  }, [enabled]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !canvas) return undefined;

    const renderer = new UpscaleRenderer({
      onStats: setStats,
      onError: () => setFailed(true),
    });
    rendererRef.current = renderer;

    renderer.start(video, canvas).catch((error) => {
      log.error('Upscale start failed:', error);
      setFailed(true);
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

  useEffect(() => {
    if (!active || !rect.width) return;
    rendererRef.current?.resize(
      getCanvasPixelSize(rect, window.devicePixelRatio),
    );
  }, [active, rect]);

  useEffect(() => {
    rendererRef.current?.setSplit(compare ? split : 1);
  }, [active, compare, split]);

  const moveSplit = (clientX: number) => {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame?.width) return;
    setSplit(clampSplit((clientX - frame.left) / frame.width));
  };

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

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
        ref={frameRef}
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

        {compare && (
          <Box
            role="slider"
            aria-label="Черта сравнения"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(split * 100)}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              moveSplit(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                moveSplit(event.clientX);
              }
            }}
            onClick={stop}
            onDoubleClick={stop}
            onMouseDown={stop}
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${split * 100}%`,
              width: UPSCALE_COMPARE_HIT_WIDTH,
              transform: 'translateX(-50%)',
              pointerEvents: 'auto',
              cursor: 'ew-resize',
              touchAction: 'none',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: 2,
                transform: 'translateX(-50%)',
                backgroundColor: customColors.onVideoColor,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: UPSCALE_COMPARE_KNOB_SIZE,
                height: UPSCALE_COMPARE_KNOB_SIZE,
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: customColors.onVideoColor,
                color: `rgb(${customColors.onVideoSurfaceRgb})`,
              }}
            >
              <ChevronsLeftRight sx={{ fontSize: 18 }} />
            </Box>
            <Typography
              sx={{
                ...tagSx,
                position: 'absolute',
                top: `calc(50% - ${UPSCALE_COMPARE_KNOB_SIZE}px)`,
                right: '100%',
                mr: 1,
              }}
            >
              Anime4K
            </Typography>
            <Typography
              sx={{
                ...tagSx,
                position: 'absolute',
                top: `calc(50% - ${UPSCALE_COMPARE_KNOB_SIZE}px)`,
                left: '100%',
                ml: 1,
              }}
            >
              Оригинал
            </Typography>
          </Box>
        )}

        {stats && (
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
