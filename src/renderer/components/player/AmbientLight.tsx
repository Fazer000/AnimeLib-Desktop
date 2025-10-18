/* eslint-disable no-console */
import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import { Box } from '@mui/material';

interface AmbientLightProps {
  videoRef:
    | React.RefObject<HTMLVideoElement | null>
    | { current: HTMLVideoElement | null };
  isPlaying: boolean;
  isFullscreen: boolean;
}

/**
 * AmbientLight - Компонент для создания амбиентной подсветки под видео
 * Анализирует цвета на краях видео и создает красивое свечение
 */
const AmbientLight = memo(
  ({ videoRef, isPlaying, isFullscreen }: AmbientLightProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateRef = useRef<number>(0); // Трекер последнего обновления
    const [dominantColors, setDominantColors] = useState<string[]>([
      'rgba(0, 0, 0, 0)',
      'rgba(0, 0, 0, 0)',
      'rgba(0, 0, 0, 0)',
    ]);

    useEffect(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || isFullscreen) {
        return undefined;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return undefined;
      }

      // Настройки для семплирования
      const sampleSize = 16; // Уменьшен размер для быстрого анализа
      canvas.width = sampleSize;
      canvas.height = sampleSize;

      const minUpdateInterval = 2000; // Минимум 2 секунды между обновлениями цвета

      const extractColors = () => {
        if (!isPlaying || video.paused || video.ended) {
          animationFrameRef.current = requestAnimationFrame(extractColors);
          return;
        }

        const now = Date.now();
        // Обновляем цвета не чаще раза в 2 секунды
        if (now - lastUpdateRef.current < minUpdateInterval) {
          animationFrameRef.current = requestAnimationFrame(extractColors);
          return;
        }

        lastUpdateRef.current = now;

        try {
          // Рисуем видео на canvas
          ctx.drawImage(video, 0, 0, sampleSize, sampleSize);

          // Получаем данные пикселей
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
          const { data } = imageData;

          // Разделяем на 3 зоны: верх, лево, право (избегаем низ где контролы)
          const zones = {
            top: { r: 0, g: 0, b: 0, count: 0 },
            left: { r: 0, g: 0, b: 0, count: 0 },
            right: { r: 0, g: 0, b: 0, count: 0 },
          };

          // Анализируем только верхнюю половину (избегаем контролы внизу)
          const edgeSize = 2; // Уменьшен размер края (было 4)
          const excludeBottomRows = Math.floor(sampleSize * 0.25); // Исключаем нижние 25%
          const step = 2; // Пропускаем каждый второй пиксель для скорости

          for (let y = 0; y < sampleSize - excludeBottomRows; y += step) {
            for (let x = 0; x < sampleSize; x += step) {
              const idx = (y * sampleSize + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];

              // Пропускаем слишком темные или слишком яркие пиксели
              const brightness = (r + g + b) / 3;
              if (brightness >= 20 && brightness <= 235) {
                // Определяем зону (упрощенная логика)
                if (y < edgeSize) {
                  zones.top.r += r;
                  zones.top.g += g;
                  zones.top.b += b;
                  zones.top.count += 1;
                } else if (x < edgeSize) {
                  zones.left.r += r;
                  zones.left.g += g;
                  zones.left.b += b;
                  zones.left.count += 1;
                } else if (x >= sampleSize - edgeSize) {
                  zones.right.r += r;
                  zones.right.g += g;
                  zones.right.b += b;
                  zones.right.count += 1;
                }
              }
            }
          }

          // Вычисляем средние цвета для каждой зоны
          const colors: string[] = [];

          Object.values(zones).forEach((zone) => {
            if (zone.count > 5) {
              // Минимум 5 пикселей для валидности
              const r = Math.round(zone.r / zone.count);
              const g = Math.round(zone.g / zone.count);
              const b = Math.round(zone.b / zone.count);

              // Упрощенная проверка насыщенности
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);

              if (max - min > 25) {
                // Быстрая проверка вместо деления
                // Упрощенное повышение насыщенности
                const avgGray = (r + g + b) / 3;
                const newR = Math.min(
                  255,
                  Math.round(avgGray + (r - avgGray) * 1.2),
                );
                const newG = Math.min(
                  255,
                  Math.round(avgGray + (g - avgGray) * 1.2),
                );
                const newB = Math.min(
                  255,
                  Math.round(avgGray + (b - avgGray) * 1.2),
                );

                colors.push(`rgba(${newR}, ${newG}, ${newB}, 0.4)`);
              }
            }
          });

          // Если получили цвета и они отличаются от текущих, обновляем
          if (colors.length > 0) {
            setDominantColors((prevColors) => {
              // Проверяем, изменились ли цвета значительно
              const hasChanged = colors.some((color, idx) => {
                if (!prevColors[idx]) return true;
                return color !== prevColors[idx];
              });

              return hasChanged ? colors : prevColors;
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[AnimeLIB] AmbientLight error:', error);
        }

        animationFrameRef.current = requestAnimationFrame(extractColors);
      };

      // Запускаем анализ
      extractColors();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [videoRef, isPlaying, isFullscreen]);

    // Мемоизируем стили градиентов
    const gradientStyles = useMemo(
      () => ({
        main: {
          background: `radial-gradient(ellipse 100% 60% at 50% 100%, ${dominantColors[0]} 0%, transparent 100%)`,
          filter: 'blur(120px)',
          opacity: 0.4,
        },
        left: {
          background: `linear-gradient(to right, ${dominantColors[1]} 0%, transparent 100%)`,
          filter: 'blur(100px)',
          opacity: 0.35,
        },
        right: {
          background: `linear-gradient(to left, ${dominantColors[2]} 0%, transparent 100%)`,
          filter: 'blur(100px)',
          opacity: 0.35,
        },
      }),
      [dominantColors],
    );

    // Не показываем в fullscreen
    if (isFullscreen) {
      return null;
    }

    return (
      <>
        {/* Скрытый canvas для анализа */}
        <canvas
          ref={canvasRef}
          style={{
            display: 'none',
          }}
        />

        {/* Амбиент эффект */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '350px',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: isPlaying ? 1 : 0.3,
            transition: 'opacity 0.8s ease',
            overflow: 'visible',
            mixBlendMode: 'screen',
            willChange: 'opacity', // GPU acceleration hint
          }}
        >
          {/* Основной градиент снизу */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100%',
              ...gradientStyles.main,
              transition: 'background 4s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'background',
            }}
          />

          {/* Левая сторона */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '50%',
              height: '90%',
              ...gradientStyles.left,
              transition: 'background 4.5s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'background',
            }}
          />

          {/* Правая сторона */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '50%',
              height: '90%',
              ...gradientStyles.right,
              transition: 'background 4.5s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'background',
            }}
          />
        </Box>
      </>
    );
  },
);

AmbientLight.displayName = 'AmbientLight';

export default AmbientLight;
