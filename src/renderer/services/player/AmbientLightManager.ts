import { createLogger } from '../../../shared/logger';

const log = createLogger('AmbientLightManager');

export interface AmbientColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface AmbientColors {
  top: AmbientColor;
  bottom: AmbientColor;
  left: AmbientColor;
  right: AmbientColor;
}

type SamplingContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

const TRANSPARENT: AmbientColor = { r: 0, g: 0, b: 0, a: 0 };

/** Цвета передаются числами: строка градиента собирается один раз в компоненте. */
export default class AmbientLightManager {
  private ctx: SamplingContext;

  private rafId: number | null = null;

  private lastSampleTime = 0;

  private video: HTMLVideoElement | null = null;

  private sampleSize = 16;

  private minUpdateInterval = 100;

  private interpolationFactor = 0.25;

  private currentColors: AmbientColors = {
    top: TRANSPARENT,
    bottom: TRANSPARENT,
    left: TRANSPARENT,
    right: TRANSPARENT,
  };

  private onColorsUpdate: ((colors: AmbientColors) => void) | null = null;

  constructor() {
    this.ctx = AmbientLightManager.createContext(this.sampleSize);
  }

  /** OffscreenCanvas, когда доступен: сэмплирование не создаёт DOM-узел. */
  private static createContext(size: number): SamplingContext {
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(size, size).getContext('2d', {
        willReadFrequently: true,
      });
      if (offscreen) return offscreen;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Failed to get 2D context for AmbientLight canvas');
    }
    return context;
  }

  setOnColorsUpdate(callback: (colors: AmbientColors) => void): void {
    this.onColorsUpdate = callback;
  }

  private static interpolate(
    from: AmbientColor,
    to: AmbientColor,
    factor: number,
  ): AmbientColor {
    return {
      r: Math.round(from.r + (to.r - from.r) * factor),
      g: Math.round(from.g + (to.g - from.g) * factor),
      b: Math.round(from.b + (to.b - from.b) * factor),
      a: from.a + (to.a - from.a) * factor,
    };
  }

  private static getDominantColor(
    pixels: { r: number; g: number; b: number }[],
  ): AmbientColor {
    if (pixels.length === 0) return TRANSPARENT;

    const colorBuckets = new Map<
      string,
      { r: number; g: number; b: number; count: number }
    >();

    pixels.forEach((pixel) => {
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
        colorBuckets.set(key, { r: pixel.r, g: pixel.g, b: pixel.b, count: 1 });
      }
    });

    let maxCount = 0;
    let dominantBucket = { r: 0, g: 0, b: 0, count: 0 };

    colorBuckets.forEach((bucket) => {
      if (bucket.count > maxCount) {
        maxCount = bucket.count;
        dominantBucket = bucket;
      }
    });

    const r = Math.round(dominantBucket.r / dominantBucket.count);
    const g = Math.round(dominantBucket.g / dominantBucket.count);
    const b = Math.round(dominantBucket.b / dominantBucket.count);

    const avgGray = (r + g + b) / 10;
    const saturationBoost = 2;

    return {
      r: Math.min(255, Math.round(avgGray + (r - avgGray) * saturationBoost)),
      g: Math.min(255, Math.round(avgGray + (g - avgGray) * saturationBoost)),
      b: Math.min(255, Math.round(avgGray + (b - avgGray) * saturationBoost)),
      a: 0.4,
    };
  }

  private sample(video: HTMLVideoElement): void {
    try {
      this.ctx.drawImage(video, 0, 0, this.sampleSize, this.sampleSize);

      const { data } = this.ctx.getImageData(
        0,
        0,
        this.sampleSize,
        this.sampleSize,
      );

      const zones = {
        top: [] as { r: number; g: number; b: number }[],
        bottom: [] as { r: number; g: number; b: number }[],
        left: [] as { r: number; g: number; b: number }[],
        right: [] as { r: number; g: number; b: number }[],
      };

      const edgeThickness = 2;

      for (let y = 0; y < this.sampleSize; y += 1) {
        for (let x = 0; x < this.sampleSize; x += 1) {
          const idx = (y * this.sampleSize + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const brightness = (r + g + b) / 3;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);

          if (brightness >= 20 && brightness <= 235 && max - min >= 20) {
            const pixel = { r, g, b };

            if (y < edgeThickness) zones.top.push(pixel);
            if (y >= this.sampleSize - edgeThickness) zones.bottom.push(pixel);
            if (x < edgeThickness) zones.left.push(pixel);
            if (x >= this.sampleSize - edgeThickness) zones.right.push(pixel);
          }
        }
      }

      const factor = this.interpolationFactor;

      this.currentColors = {
        top: AmbientLightManager.interpolate(
          this.currentColors.top,
          AmbientLightManager.getDominantColor(zones.top),
          factor,
        ),
        bottom: AmbientLightManager.interpolate(
          this.currentColors.bottom,
          AmbientLightManager.getDominantColor(zones.bottom),
          factor,
        ),
        left: AmbientLightManager.interpolate(
          this.currentColors.left,
          AmbientLightManager.getDominantColor(zones.left),
          factor,
        ),
        right: AmbientLightManager.interpolate(
          this.currentColors.right,
          AmbientLightManager.getDominantColor(zones.right),
          factor,
        ),
      };

      this.onColorsUpdate?.(this.currentColors);
    } catch (error) {
      log.error('Error extracting colors:', error);
    }
  }

  /** Кадры пропускаются до истечения minUpdateInterval; в фоновом окне rAF не тикает. */
  private tick = (timestamp: number): void => {
    const { video } = this;

    if (!video || video.paused || video.ended) {
      this.rafId = null;
      return;
    }

    if (timestamp - this.lastSampleTime >= this.minUpdateInterval) {
      this.lastSampleTime = timestamp;
      this.sample(video);
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  start(video: HTMLVideoElement, isPlaying: boolean): void {
    this.stop();
    if (!isPlaying) return;

    this.video = video;
    this.lastSampleTime = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.video = null;
  }

  reset(): void {
    this.currentColors = {
      top: TRANSPARENT,
      bottom: TRANSPARENT,
      left: TRANSPARENT,
      right: TRANSPARENT,
    };
    this.onColorsUpdate?.(this.currentColors);
  }

  getCurrentColors(): AmbientColors {
    return { ...this.currentColors };
  }

  dispose(): void {
    this.stop();
    this.onColorsUpdate = null;
  }
}
