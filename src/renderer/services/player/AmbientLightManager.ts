/* eslint-disable no-console */

/**
 * AmbientLightManager - Менеджер для управления амбиентной подсветкой видео
 * Анализирует цвета на краях видео и вычисляет доминантные цвета для каждой зоны
 */
export default class AmbientLightManager {
  private canvas: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D;

  private animationFrameId: number | null = null;

  private lastUpdateTime: number = 0;

  private sampleSize = 32;

  private minUpdateInterval = 150; // 150ms между обновлениями

  private interpolationFactor = 0.08; // Маленький шаг для плавности

  private currentColors = {
    top: 'rgba(0, 0, 0, 0)',
    bottom: 'rgba(0, 0, 0, 0)',
    left: 'rgba(0, 0, 0, 0)',
    right: 'rgba(0, 0, 0, 0)',
  };

  private onColorsUpdate:
    | ((colors: {
        top: string;
        bottom: string;
        left: string;
        right: string;
      }) => void)
    | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.sampleSize;
    this.canvas.height = this.sampleSize;

    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Failed to get 2D context for AmbientLight canvas');
    }
    this.ctx = context;
  }

  /**
   * Устанавливает callback для обновления цветов
   */
  setOnColorsUpdate(
    callback: (colors: {
      top: string;
      bottom: string;
      left: string;
      right: string;
    }) => void,
  ): void {
    this.onColorsUpdate = callback;
  }

  /**
   * Парсит rgba строку в объект компонентов
   */
  // eslint-disable-next-line class-methods-use-this
  private parseRgba(rgba: string): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  /**
   * Интерполирует между двумя цветами
   */
  private interpolateColor(
    color1: string,
    color2: string,
    factor: number,
  ): string {
    const c1 = this.parseRgba(color1);
    const c2 = this.parseRgba(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    const a = c1.a + (c2.a - c1.a) * factor;

    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }

  /**
   * Извлекает доминантный цвет из массива пикселей
   */
  // eslint-disable-next-line class-methods-use-this
  private getDominantColor(
    pixels: { r: number; g: number; b: number }[],
  ): string {
    if (pixels.length === 0) return 'rgba(0, 0, 0, 0)';

    // Группируем похожие цвета
    const colorBuckets: Map<
      string,
      { r: number; g: number; b: number; count: number }
    > = new Map();

    pixels.forEach((pixel) => {
      // Округляем до ближайшего кратного 16 для группировки
      const bucketR = Math.round(pixel.r / 16) * 16;
      const bucketG = Math.round(pixel.g / 16) * 16;
      const bucketB = Math.round(pixel.b / 16) * 16;
      const key = `${bucketR},${bucketG},${bucketB}`;

      const existing = colorBuckets.get(key);
      if (existing) {
        existing.r += pixel.r;
        existing.g += pixel.g;
        existing.b += pixel.b;
        existing.count += 1;
      } else {
        colorBuckets.set(key, {
          r: pixel.r,
          g: pixel.g,
          b: pixel.b,
          count: 1,
        });
      }
    });

    // Находим самый популярный bucket
    let maxCount = 0;
    let dominantBucket: { r: number; g: number; b: number; count: number } = {
      r: 0,
      g: 0,
      b: 0,
      count: 0,
    };

    colorBuckets.forEach((bucket) => {
      if (bucket.count > maxCount) {
        maxCount = bucket.count;
        dominantBucket = bucket;
      }
    });

    // Вычисляем средний цвет в bucket
    const r = Math.round(dominantBucket.r / dominantBucket.count);
    const g = Math.round(dominantBucket.g / dominantBucket.count);
    const b = Math.round(dominantBucket.b / dominantBucket.count);

    // Повышаем насыщенность
    const avgGray = (r + g + b) / 10;
    const saturationBoost = 2;
    const newR = Math.min(
      255,
      Math.round(avgGray + (r - avgGray) * saturationBoost),
    );
    const newG = Math.min(
      255,
      Math.round(avgGray + (g - avgGray) * saturationBoost),
    );
    const newB = Math.min(
      255,
      Math.round(avgGray + (b - avgGray) * saturationBoost),
    );

    return `rgba(${newR}, ${newG}, ${newB}, 0.4)`;
  }

  /**
   * Анализирует видео и извлекает цвета
   */
  private extractColors(video: HTMLVideoElement, isPlaying: boolean): void {
    if (!isPlaying || video.paused || video.ended) {
      this.animationFrameId = requestAnimationFrame(() =>
        this.extractColors(video, isPlaying),
      );
      return;
    }

    const now = Date.now();
    // Обновляем цвета не чаще указанного интервала
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      this.animationFrameId = requestAnimationFrame(() =>
        this.extractColors(video, isPlaying),
      );
      return;
    }

    this.lastUpdateTime = now;

    try {
      // Рисуем видео на canvas
      this.ctx.drawImage(video, 0, 0, this.sampleSize, this.sampleSize);

      // Получаем данные пикселей
      const imageData = this.ctx.getImageData(
        0,
        0,
        this.sampleSize,
        this.sampleSize,
      );
      const { data } = imageData;

      // Разделяем на 4 зоны: верх, низ, лево, право
      const zones = {
        top: [] as { r: number; g: number; b: number }[],
        bottom: [] as { r: number; g: number; b: number }[],
        left: [] as { r: number; g: number; b: number }[],
        right: [] as { r: number; g: number; b: number }[],
      };

      const edgeThickness = 4; // Толщина края для анализа

      for (let y = 0; y < this.sampleSize; y += 1) {
        for (let x = 0; x < this.sampleSize; x += 1) {
          const idx = (y * this.sampleSize + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Пропускаем слишком темные или слишком яркие пиксели
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 235) {
            // eslint-disable-next-line no-continue
            continue;
          }

          // Проверяем минимальную насыщенность
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (max - min < 20) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const pixel = { r, g, b };

          // Определяем зону
          if (y < edgeThickness) {
            zones.top.push(pixel);
          }
          if (y >= this.sampleSize - edgeThickness) {
            zones.bottom.push(pixel);
          }
          if (x < edgeThickness) {
            zones.left.push(pixel);
          }
          if (x >= this.sampleSize - edgeThickness) {
            zones.right.push(pixel);
          }
        }
      }

      // Вычисляем доминантные цвета для каждой зоны
      const targetColors = {
        top: this.getDominantColor(zones.top),
        bottom: this.getDominantColor(zones.bottom),
        left: this.getDominantColor(zones.left),
        right: this.getDominantColor(zones.right),
      };

      // Плавная интерполяция к новым цветам
      this.currentColors = {
        top: this.interpolateColor(
          this.currentColors.top,
          targetColors.top,
          this.interpolationFactor,
        ),
        bottom: this.interpolateColor(
          this.currentColors.bottom,
          targetColors.bottom,
          this.interpolationFactor,
        ),
        left: this.interpolateColor(
          this.currentColors.left,
          targetColors.left,
          this.interpolationFactor,
        ),
        right: this.interpolateColor(
          this.currentColors.right,
          targetColors.right,
          this.interpolationFactor,
        ),
      };

      // Уведомляем о новых цветах
      if (this.onColorsUpdate) {
        this.onColorsUpdate(this.currentColors);
      }
    } catch (error) {
      console.error('[AmbientLightManager] Error extracting colors:', error);
    }

    this.animationFrameId = requestAnimationFrame(() =>
      this.extractColors(video, isPlaying),
    );
  }

  /**
   * Запускает анализ видео
   */
  start(video: HTMLVideoElement, isPlaying: boolean): void {
    if (this.animationFrameId !== null) {
      this.stop();
    }
    this.extractColors(video, isPlaying);
  }

  /**
   * Останавливает анализ видео
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Сбрасывает цвета к начальным значениям
   */
  reset(): void {
    this.currentColors = {
      top: 'rgba(0, 0, 0, 0)',
      bottom: 'rgba(0, 0, 0, 0)',
      left: 'rgba(0, 0, 0, 0)',
      right: 'rgba(0, 0, 0, 0)',
    };
    if (this.onColorsUpdate) {
      this.onColorsUpdate(this.currentColors);
    }
  }

  /**
   * Получает текущие цвета
   */
  getCurrentColors(): {
    top: string;
    bottom: string;
    left: string;
    right: string;
  } {
    return { ...this.currentColors };
  }

  /**
   * Очищает ресурсы
   */
  dispose(): void {
    this.stop();
    this.onColorsUpdate = null;
  }
}
