import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { Box, Slider } from '@mui/material';
import { formatTime } from '../../utils/videoHelpers';
import { ThumbnailManager, PlaybackTimeStore } from '../../services/player';
import ThumbnailPreview from './ThumbnailPreview';

interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

type Segment = {
  start: number;
  end: number;
  type: 'normal' | 'opening' | 'ending' | 'compilation' | 'splashScreen';
};

interface ProgressBarProps {
  timeStore: PlaybackTimeStore;
  duration: number;
  hoverTime: number | null;
  onSeek: (time: number) => void;
  onProgressMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgressMouseLeave: () => void;
  timecode: TimeCode[];
  // eslint-disable-next-line react/require-default-props
  thumbnailManager?: ThumbnailManager | null;
}

const ROOT_SX = {
  position: 'relative',
  px: 0.5,
  height: 16,
  display: 'flex',
  alignItems: 'center',
};

const TRACK_SX = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  left: 4,
  right: 4,
  height: 5,
  display: 'flex',
  gap: '3px',
  transition: 'height 0.2s ease',
  overflow: 'hidden',
  '&:hover': {
    height: 8,
  },
};

const SEGMENT_BG_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 10,
  backdropFilter: 'blur(10px)',
};

const SEGMENT_BUFFERED_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  height: '100%',
  width: 0,
  backgroundColor: 'rgba(255, 255, 255, 0.25)',
  borderRadius: 10,
  transition: 'width 0.3s ease',
};

const HOVER_MARKER_SX = {
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: 2,
  height: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderRadius: 1,
  pointerEvents: 'none',
  zIndex: 10,
};

const SLIDER_SX = {
  color: '#7C3AED',
  height: 28,
  padding: '0 !important',
  cursor: 'pointer',
  '& .MuiSlider-track': {
    display: 'none',
  },
  '& .MuiSlider-rail': {
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  '& .MuiSlider-thumb': {
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    border: '3px solid #BB86FC',
    opacity: 0,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'grab',
    '&:hover': {
      opacity: 1,
      width: 16,
      height: 16,
    },
    '&.Mui-active': {
      opacity: 1,
      width: 18,
      height: 18,
      cursor: 'grabbing',
    },
  },
  '&:hover .MuiSlider-thumb': {
    opacity: 1,
  },
};

const TOOLTIP_SX = {
  position: 'absolute',
  bottom: 24,
  transform: 'translateX(-50%)',
  color: '#fff',
  padding: '6px 12px',
  backgroundColor: 'rgba(41, 41, 41, 0.62)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 2,
  fontSize: '12px',
  fontFamily: 'Roboto, sans-serif',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  zIndex: 2001,
  pointerEvents: 'none',
  animation: 'tooltipAppear 0.15s ease-out',
  '@keyframes tooltipAppear': {
    from: {
      opacity: 0,
      transform: 'translateX(-50%) translateY(5px)',
    },
    to: {
      opacity: 1,
      transform: 'translateX(-50%) translateY(0)',
    },
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
    width: 8,
    height: 8,
    backgroundColor: 'rgba(41, 41, 41, 0.62)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderTop: 'none',
    borderLeft: 'none',
  },
};

/** Доля сегмента, покрытая моментом времени, в процентах. */
export const segmentFill = (segment: Segment, time: number): number => {
  if (time <= segment.start) return 0;
  if (time >= segment.end) return 100;

  const length = segment.end - segment.start;
  if (length <= 0) return 0;

  return ((time - segment.start) / length) * 100;
};

/**
 * Прогресс воспроизведения. Заливка обновляется прямой записью в style,
 * поэтому тик времени не вызывает перерисовку React.
 */
function ProgressBar({
  timeStore,
  duration,
  hoverTime,
  onSeek,
  onProgressMouseMove,
  onProgressMouseLeave,
  timecode = [],
  thumbnailManager = null,
}: ProgressBarProps) {
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderTime, setSliderTime] = useState(0);
  const dragTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const progressRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bufferedRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const [isApproximate, setIsApproximate] = useState(false);
  const thumbnailTimeRef = useRef<number | null>(null);
  const thumbnailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const segments = useMemo<Segment[]>(() => {
    if (!duration || duration <= 0) {
      return [{ start: 0, end: 0, type: 'normal' }];
    }

    if (!timecode || timecode.length === 0) {
      return [{ start: 0, end: duration, type: 'normal' }];
    }

    const segs: Segment[] = [];
    let lastEnd = 0;

    const sortedTimecode = [...timecode]
      .filter((tc) => tc.from < tc.to && tc.from >= 0 && tc.to <= duration)
      .sort((a, b) => a.from - b.from);

    sortedTimecode.forEach((tc) => {
      const segmentStart = Math.max(0, tc.from);
      const segmentEnd = Math.min(duration, tc.to);

      if (segmentStart < lastEnd) {
        lastEnd = Math.max(lastEnd, segmentEnd);
        return;
      }

      if (segmentStart > lastEnd) {
        segs.push({ start: lastEnd, end: segmentStart, type: 'normal' });
      }

      segs.push({ start: segmentStart, end: segmentEnd, type: tc.type });
      lastEnd = segmentEnd;
    });

    if (lastEnd < duration) {
      segs.push({ start: lastEnd, end: duration, type: 'normal' });
    }

    if (segs.length > 0) {
      segs[segs.length - 1].end = duration;
    }

    return segs;
  }, [timecode, duration]);

  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const needsSliderRef = useRef(false);
  needsSliderRef.current = hoverTime !== null || isDragging;

  useEffect(() => {
    const paint = (currentTime: number, buffered: number) => {
      const displayTime = dragTimeRef.current ?? currentTime;

      segmentsRef.current.forEach((segment, index) => {
        const progressEl = progressRefs.current[index];
        if (progressEl) {
          progressEl.style.width = `${segmentFill(segment, displayTime)}%`;
        }

        const bufferedEl = bufferedRefs.current[index];
        if (bufferedEl) {
          bufferedEl.style.width = `${segmentFill(segment, buffered)}%`;
        }
      });

      if (needsSliderRef.current) {
        setSliderTime(displayTime);
      }
    };

    paint(timeStore.getCurrentTime(), timeStore.getBuffered());
    return timeStore.subscribe(paint);
  }, [timeStore, segments]);

  const handleDragChange = useCallback((time: number) => {
    dragTimeRef.current = time;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setDragTime(dragTimeRef.current);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (thumbnailTimeoutRef.current) {
        clearTimeout(thumbnailTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (thumbnailManager && hoverTime !== null && duration > 0) {
      thumbnailManager.startPreCaching(duration);
    }
  }, [thumbnailManager, hoverTime, duration]);

  useEffect(() => {
    if (!thumbnailManager || hoverTime === null) {
      setThumbnailUrl(null);
      setIsThumbnailLoading(false);
      setIsApproximate(false);
      thumbnailTimeRef.current = null;
      if (thumbnailTimeoutRef.current) {
        clearTimeout(thumbnailTimeoutRef.current);
        thumbnailTimeoutRef.current = null;
      }
      return;
    }

    const roundedTime = Math.floor(hoverTime);

    if (thumbnailTimeRef.current === roundedTime) {
      return;
    }

    thumbnailTimeRef.current = roundedTime;

    if (thumbnailTimeoutRef.current) {
      clearTimeout(thumbnailTimeoutRef.current);
    }

    const exactCached = thumbnailManager.getExactCached(roundedTime);
    if (exactCached) {
      setThumbnailUrl(exactCached);
      setIsThumbnailLoading(false);
      setIsApproximate(false);
      return;
    }

    const nearest = thumbnailManager.getNearestCached(roundedTime);
    if (nearest) {
      setThumbnailUrl(nearest);
      setIsThumbnailLoading(false);
      setIsApproximate(true);
    } else {
      setIsThumbnailLoading(true);
      setIsApproximate(false);
    }

    thumbnailTimeoutRef.current = setTimeout(() => {
      thumbnailManager
        .getThumbnail(roundedTime, 10)
        .then((url) => {
          if (thumbnailTimeRef.current === roundedTime) {
            setThumbnailUrl(url);
            setIsThumbnailLoading(false);
            setIsApproximate(false);
          }
          return url;
        })
        .catch(() => {
          if (thumbnailTimeRef.current === roundedTime) {
            setIsThumbnailLoading(false);
          }
        });
    }, 40);
  }, [hoverTime, thumbnailManager]);

  const progressTransition = isDragging ? 'none' : 'width 0.1s ease';

  return (
    <Box sx={ROOT_SX}>
      <Box sx={TRACK_SX}>
        {segments.map((segment, index) => {
          const segmentDuration = segment.end - segment.start;

          if (segmentDuration <= 0 || duration <= 0) {
            return null;
          }

          let segmentWidth = (segmentDuration / duration) * 100;

          if (index === segments.length - 1) {
            const previousWidths = segments
              .slice(0, index)
              .reduce((sum, seg) => {
                const dur = seg.end - seg.start;
                return sum + (dur / duration) * 100;
              }, 0);
            segmentWidth = Math.max(0.1, 100 - previousWidths);
          }

          segmentWidth = Math.max(0, Math.min(100, segmentWidth));

          return (
            <Box
              key={`segment-${segment.start}-${segment.end}`}
              sx={{
                position: 'relative',
                width: `${segmentWidth}%`,
                height: '100%',
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              <Box sx={SEGMENT_BG_SX} />

              <Box
                ref={(el: HTMLDivElement | null) => {
                  bufferedRefs.current[index] = el;
                }}
                sx={SEGMENT_BUFFERED_SX}
              />

              <Box
                ref={(el: HTMLDivElement | null) => {
                  progressRefs.current[index] = el;
                }}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: 0,
                  background: '#7C3AED',
                  borderRadius: 10,
                  transition: progressTransition,
                  willChange: isDragging ? 'width' : 'auto',
                }}
              />
            </Box>
          );
        })}
      </Box>

      <Slider
        value={dragTime !== null ? dragTime : sliderTime}
        min={0}
        max={duration || 100}
        step={0.1}
        onChange={(event: Event, value: number | number[]) => {
          const time = Array.isArray(value) ? value[0] : value;

          if (!isDragging) {
            setIsDragging(true);
          }

          handleDragChange(time);

          onProgressMouseMove({
            currentTarget: {
              getBoundingClientRect: () => ({
                left: 0,
                width: duration,
              }),
            },
            clientX: time,
          } as any);
        }}
        onChangeCommitted={(
          event: Event | React.SyntheticEvent,
          value: number | number[],
        ) => {
          const time = Array.isArray(value) ? value[0] : value;

          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }

          dragTimeRef.current = null;
          setDragTime(null);
          setIsDragging(false);
          setSliderTime(time);

          onSeek(time);
        }}
        onMouseMove={(event: React.MouseEvent) => {
          if (duration > 0) {
            const rect = (
              event.currentTarget as HTMLElement
            ).getBoundingClientRect();
            onProgressMouseMove({
              currentTarget: {
                getBoundingClientRect: () => rect,
              },
              clientX: event.clientX,
            } as any);
          }
        }}
        onMouseLeave={onProgressMouseLeave}
        sx={SLIDER_SX}
      />

      {hoverTime !== null && duration > 0 && (
        <Box
          sx={{
            ...HOVER_MARKER_SX,
            left: `${(hoverTime / duration) * 100}%`,
          }}
        />
      )}

      {hoverTime !== null &&
        (thumbnailManager ? (
          <ThumbnailPreview
            thumbnailUrl={thumbnailUrl}
            time={hoverTime}
            duration={duration}
            isLoading={isThumbnailLoading}
            isApproximate={isApproximate}
            position={{
              x: `${(hoverTime / duration) * 100}%`,
              y: 24,
            }}
          />
        ) : (
          <Box
            sx={{
              ...TOOLTIP_SX,
              left: `${(hoverTime / duration) * 100}%`,
            }}
          >
            {formatTime(hoverTime)}
          </Box>
        ))}
    </Box>
  );
}

export default ProgressBar;
