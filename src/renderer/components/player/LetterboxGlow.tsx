import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import AmbientLight from './AmbientLight';
import { getContainRect, Rect } from '../../utils/upscaleGeometry';
import { getLetterboxClipPath, hasLetterbox } from '../../utils/letterbox';
import {
  LETTERBOX_MIN_PX,
  LETTERBOX_SEAM_OVERLAP_PX,
} from '../../../constants';
import { BLACK_SHORT } from '../../theme/palette';

const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

interface LetterboxGlowProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  isPlaying: boolean;
  onActiveChange: (active: boolean) => void;
}

/** Подсветка в полях вокруг кадра */
function LetterboxGlow({
  videoRef,
  isPlaying,
  onActiveChange,
}: LetterboxGlowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({
    rect: EMPTY_RECT,
    width: 0,
    height: 0,
  });
  const activeHandlerRef = useRef(onActiveChange);
  activeHandlerRef.current = onActiveChange;

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return undefined;

    const update = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      setLayout({
        rect: getContainRect(
          width,
          height,
          video.videoWidth,
          video.videoHeight,
        ),
        width,
        height,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);
    video.addEventListener('emptied', update);

    return () => {
      observer.disconnect();
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
      video.removeEventListener('emptied', update);
    };
  }, [videoRef]);

  const active = hasLetterbox(
    layout.rect,
    layout.width,
    layout.height,
    LETTERBOX_MIN_PX,
  );

  useEffect(() => {
    activeHandlerRef.current(active);
  }, [active]);

  useEffect(() => () => activeHandlerRef.current(false), []);

  return (
    <Box
      ref={containerRef}
      sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {active && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: -1,
            overflow: 'hidden',
            isolation: 'isolate',
            backgroundColor: BLACK_SHORT,
            clipPath: getLetterboxClipPath(
              layout.rect,
              layout.width,
              layout.height,
              LETTERBOX_SEAM_OVERLAP_PX,
            ),
          }}
        >
          <AmbientLight
            videoRef={videoRef}
            isPlaying={isPlaying}
            isFullscreen={false}
            enabled
          />
        </Box>
      )}
    </Box>
  );
}

export default LetterboxGlow;
