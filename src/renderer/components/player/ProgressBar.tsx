import React, {
  useMemo,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { Box, Slider } from '@mui/material';
import { formatTime } from '../../utils/videoHelpers';
import { ThumbnailManager } from '../../services/player';
import ThumbnailPreview from './ThumbnailPreview';

interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  hoverTime: number | null;
  onSeek: (time: number) => void;
  onProgressMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgressMouseLeave: () => void;
  timecode: TimeCode[];
  // eslint-disable-next-line react/require-default-props
  thumbnailManager?: ThumbnailManager | null;
}

function ProgressBar({
  currentTime,
  duration,
  buffered,
  hoverTime,
  onSeek,
  onProgressMouseMove,
  onProgressMouseLeave,
  timecode = [],
  thumbnailManager = null,
}: ProgressBarProps) {
  const [dragTime, setDragTime] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const [isApproximate, setIsApproximate] = useState(false);
  const thumbnailTimeRef = useRef<number | null>(null);
  const thumbnailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const segments = useMemo(() => {
    if (!duration || duration <= 0) {
      return [{ start: 0, end: 0, type: 'normal' as const }];
    }

    if (!timecode || timecode.length === 0) {
      return [{ start: 0, end: duration, type: 'normal' as const }];
    }

    const segs: Array<{
      start: number;
      end: number;
      type: 'normal' | 'opening' | 'ending' | 'compilation' | 'splashScreen';
    }> = [];
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

  const displayTime = dragTime !== null ? dragTime : currentTime;
  const sliderValue = duration > 0 ? displayTime : 0;

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

  React.useEffect(() => {
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

    // 1. Точный кадр уже в кэше — показываем сразу без blur
    const exactCached = thumbnailManager.getExactCached(roundedTime);
    if (exactCached) {
      setThumbnailUrl(exactCached);
      setIsThumbnailLoading(false);
      setIsApproximate(false);
      return;
    }

    // 2. Ближайший кадр — показываем сразу с blur как placeholder
    const nearest = thumbnailManager.getNearestCached(roundedTime);
    if (nearest) {
      setThumbnailUrl(nearest);
      setIsThumbnailLoading(false);
      setIsApproximate(true);
    } else {
      setIsThumbnailLoading(true);
      setIsApproximate(false);
    }

    // 3. Грузим точный кадр
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

  return (
    <Box
      sx={{
        position: 'relative',
        px: 0.5,
        height: 16,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Сегментированный прогресс-бар */}
      <Box
        sx={{
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
        }}
      >
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
            segmentWidth = 100 - previousWidths;
            segmentWidth = Math.max(0.1, segmentWidth);
          }

          segmentWidth = Math.max(0, Math.min(100, segmentWidth));

          let segmentProgress = 0;
          if (displayTime >= segment.start) {
            if (displayTime <= segment.end) {
              segmentProgress =
                ((displayTime - segment.start) / segmentDuration) * 100;
            } else {
              segmentProgress = 100;
            }
          }

          const bufferedTime = buffered * duration;
          let segmentBuffered = 0;
          if (bufferedTime >= segment.start) {
            if (bufferedTime <= segment.end) {
              segmentBuffered =
                ((bufferedTime - segment.start) / segmentDuration) * 100;
            } else {
              segmentBuffered = 100;
            }
          }

          segmentProgress = Math.max(0, Math.min(100, segmentProgress));
          segmentBuffered = Math.max(0, Math.min(100, segmentBuffered));

          const colors = {
            bg: 'rgba(255, 255, 255, 0.15)',
            buffered: 'rgba(255, 255, 255, 0.25)',
            progress: '#7C3AED',
          };

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
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '100%',
                  backgroundColor: colors.bg,
                  borderRadius: 10,
                  backdropFilter: 'blur(10px)',
                }}
              />

              {segmentBuffered > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${segmentBuffered}%`,
                    backgroundColor: colors.buffered,
                    borderRadius: 10,
                    transition: 'width 0.3s ease',
                  }}
                />
              )}

              {segmentProgress > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${segmentProgress}%`,
                    background: colors.progress,
                    borderRadius: 10,
                    transition: isDragging ? 'none' : 'width 0.1s ease',
                    willChange: isDragging ? 'width' : 'auto',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Слайдер для взаимодействия */}
      <Slider
        value={sliderValue}
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
        sx={{
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
        }}
      />

      {hoverTime !== null && duration > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: `${(hoverTime / duration) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 2,
            height: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: 1,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />
      )}

      {/* Thumbnail Preview или Tooltip */}
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
              position: 'absolute',
              bottom: 24,
              left: `${(hoverTime / duration) * 100}%`,
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
            }}
          >
            {formatTime(hoverTime)}
          </Box>
        ))}
    </Box>
  );
}

export default ProgressBar;
