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
  thumbnailManager = null,
}: ProgressBarProps) {
  // Локальное состояние для плавного драга без запросов
  const [dragTime, setDragTime] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Thumbnail state
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const thumbnailTimeRef = useRef<number | null>(null);
  const thumbnailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Мемоизация сегментов - пересчитываем только при изменении timecode или duration
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

    // Сортируем timecode по времени начала и фильтруем некорректные
    const sortedTimecode = [...timecode]
      .filter((tc) => tc.from < tc.to && tc.from >= 0 && tc.to <= duration)
      .sort((a, b) => a.from - b.from);

    sortedTimecode.forEach((tc) => {
      // Ограничиваем сегмент границами видео
      const segmentStart = Math.max(0, tc.from);
      const segmentEnd = Math.min(duration, tc.to);

      // Пропускаем если сегмент уже прошли (перекрытие)
      if (segmentStart < lastEnd) {
        // Обновляем lastEnd если текущий сегмент заканчивается позже
        lastEnd = Math.max(lastEnd, segmentEnd);
        return;
      }

      // Добавляем обычный сегмент перед этим timecode (если есть зазор)
      if (segmentStart > lastEnd) {
        segs.push({ start: lastEnd, end: segmentStart, type: 'normal' });
      }

      // Добавляем сегмент timecode
      segs.push({ start: segmentStart, end: segmentEnd, type: tc.type });
      lastEnd = segmentEnd;
    });

    // Добавляем последний обычный сегмент (если есть)
    if (lastEnd < duration) {
      segs.push({ start: lastEnd, end: duration, type: 'normal' });
    }

    // Важно: корректируем последний сегмент чтобы он заканчивался ТОЧНО на duration
    if (segs.length > 0) {
      segs[segs.length - 1].end = duration;
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
      if (thumbnailTimeoutRef.current) {
        clearTimeout(thumbnailTimeoutRef.current);
      }
    };
  }, []);

  // Load thumbnail when hover time changes (ТОЛЬКО на паузе!)
  useEffect(() => {
    if (!thumbnailManager || hoverTime === null) {
      setThumbnailUrl(null);
      setIsThumbnailLoading(false);
      thumbnailTimeRef.current = null;
      if (thumbnailTimeoutRef.current) {
        clearTimeout(thumbnailTimeoutRef.current);
        thumbnailTimeoutRef.current = null;
      }
      return;
    }

    const roundedTime = Math.floor(hoverTime);

    // Если время не изменилось значительно, не загружаем новое превью
    if (thumbnailTimeRef.current === roundedTime) {
      return;
    }

    thumbnailTimeRef.current = roundedTime;

    // Debounce для предотвращения слишком частых запросов
    if (thumbnailTimeoutRef.current) {
      clearTimeout(thumbnailTimeoutRef.current);
    }

    thumbnailTimeoutRef.current = setTimeout(() => {
      setIsThumbnailLoading(true);

      thumbnailManager
        .getThumbnail(roundedTime)
        .then((url) => {
          // Проверяем что время все еще актуально
          if (thumbnailTimeRef.current === roundedTime) {
            setThumbnailUrl(url);
            setIsThumbnailLoading(false);
          }
          return url;
        })
        .catch(() => {
          // Если видео играет - это ожидаемо, не показываем превью
          setThumbnailUrl(null);
          setIsThumbnailLoading(false);
        });
    }, 150); // Debounce 150ms
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
          overflow: 'hidden', // Важно! Предотвращает выход сегментов за пределы
          '&:hover': {
            height: 8,
          },
        }}
      >
        {segments.map((segment, index) => {
          const segmentDuration = segment.end - segment.start;

          // Защита от деления на 0
          if (segmentDuration <= 0 || duration <= 0) {
            return null;
          }

          // Рассчитываем ширину сегмента
          let segmentWidth = (segmentDuration / duration) * 100;

          // Для последнего сегмента вычисляем оставшуюся ширину
          // чтобы гарантировать что сумма всех сегментов = 100%
          if (index === segments.length - 1) {
            const previousWidths = segments
              .slice(0, index)
              .reduce((sum, seg) => {
                const dur = seg.end - seg.start;
                return sum + (dur / duration) * 100;
              }, 0);
            segmentWidth = 100 - previousWidths;
            segmentWidth = Math.max(0.1, segmentWidth); // Минимум 0.1% чтобы сегмент был виден
          }

          // Ограничиваем ширину в разумных пределах
          segmentWidth = Math.max(0, Math.min(100, segmentWidth));

          // Расчет прогресса - ТОЛЬКО если displayTime в пределах или после сегмента
          let segmentProgress = 0;
          if (displayTime >= segment.start) {
            if (displayTime <= segment.end) {
              // Внутри сегмента - считаем прогресс
              segmentProgress =
                ((displayTime - segment.start) / segmentDuration) * 100;
            } else {
              // После сегмента - 100%
              segmentProgress = 100;
            }
          }
          // До сегмента - 0% (по умолчанию)

          // Расчет буферизации - аналогично прогрессу
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

          // Ограничиваем значения в пределах 0-100%
          segmentProgress = Math.max(0, Math.min(100, segmentProgress));
          segmentBuffered = Math.max(0, Math.min(100, segmentBuffered));

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
                flexShrink: 1, // Позволяем сегментам сжиматься если нужно
                minWidth: 0, // Важно для корректной работы flex-shrink
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

      {/* Thumbnail Preview или Tooltip с временем при наведении */}
      {hoverTime !== null &&
        (thumbnailManager ? (
          <ThumbnailPreview
            thumbnailUrl={thumbnailUrl}
            time={hoverTime}
            isLoading={isThumbnailLoading}
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
