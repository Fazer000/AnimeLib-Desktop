import React, { useMemo, useRef, useCallback } from 'react';
import { Box, Slider } from '@mui/material';
import { formatTime } from '../../utils/videoHelpers';

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
}

/**
 * Прогресс бар видеоплеера
 */
function ProgressBar({
  currentTime,
  duration,
  buffered,
  hoverTime,
  onSeek,
  onProgressMouseMove,
  onProgressMouseLeave,
  timecode = [],
}: ProgressBarProps) {
  // Локальное состояние для плавного драга без запросов
  const [dragTime, setDragTime] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Мемоизация сегментов - пересчитываем только при изменении timecode или duration
  const segments = useMemo(() => {
    if (!timecode || timecode.length === 0 || duration === 0) {
      return [{ start: 0, end: duration, type: 'normal' as const }];
    }

    const segs: Array<{
      start: number;
      end: number;
      type: 'normal' | 'opening' | 'ending' | 'compilation' | 'splashScreen';
    }> = [];
    let lastEnd = 0;

    // Сортируем timecode по времени начала
    const sortedTimecode = [...timecode].sort((a, b) => a.from - b.from);

    sortedTimecode.forEach((tc) => {
      // Добавляем обычный сегмент перед этим timecode
      if (tc.from > lastEnd) {
        segs.push({ start: lastEnd, end: tc.from, type: 'normal' });
      }
      // Добавляем сегмент timecode
      segs.push({ start: tc.from, end: tc.to, type: tc.type });
      lastEnd = tc.to;
    });

    // Добавляем последний обычный сегмент
    if (lastEnd < duration) {
      segs.push({ start: lastEnd, end: duration, type: 'normal' });
    }

    return segs;
  }, [timecode, duration]);

  // Используем dragTime для плавного визуального драга, иначе currentTime
  const displayTime = dragTime !== null ? dragTime : currentTime;
  const sliderValue = duration > 0 ? displayTime : 0;

  // Оптимизированный обработчик для драга с requestAnimationFrame
  const handleDragChange = useCallback((time: number) => {
    dragTimeRef.current = time;

    // Отменяем предыдущий RAF если есть
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    // Обновляем состояние через RAF для плавности
    rafRef.current = requestAnimationFrame(() => {
      setDragTime(dragTimeRef.current);
      rafRef.current = null;
    });
  }, []);

  // Cleanup RAF при unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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
          '&:hover': {
            height: 8,
          },
        }}
      >
        {segments.map((segment) => {
          const segmentDuration = segment.end - segment.start;
          const segmentWidth = (segmentDuration / duration) * 100;
          const segmentProgress = Math.max(
            0,
            Math.min(
              100,
              ((displayTime - segment.start) / segmentDuration) * 100,
            ),
          );
          const segmentBuffered = Math.max(
            0,
            Math.min(
              100,
              ((buffered * duration - segment.start) / segmentDuration) * 100,
            ),
          );

          // Единые цвета для всех сегментов
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
                flexShrink: 0,
              }}
            >
              {/* Фон сегмента */}
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

              {/* Буферизация сегмента */}
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

              {/* Прогресс сегмента */}
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

          // Устанавливаем флаг драга
          if (!isDragging) {
            setIsDragging(true);
          }

          // Обновляем локальное состояние через RAF для плавности
          handleDragChange(time);

          // Показываем tooltip во время перетаскивания
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

          // Отменяем любые pending RAF
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }

          // Сбрасываем локальное состояние драга
          dragTimeRef.current = null;
          setDragTime(null);
          setIsDragging(false);

          // ЕДИНСТВЕННЫЙ запрос на перемотку при отпускании
          onSeek(time);

          // Скрываем tooltip после завершения перетаскивания
          onProgressMouseLeave();
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

      {/* Tooltip с временем при наведении */}
      {hoverTime !== null && (
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
      )}
    </Box>
  );
}

export default ProgressBar;
