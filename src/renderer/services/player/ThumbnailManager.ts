import { createLogger } from '../../../shared/logger';

const log = createLogger('ThumbnailManager');

class ThumbnailManager {
  private videoSrc: string | null = null;

  private seekVideo: HTMLVideoElement | null = null;

  private seekVideoReady = false;

  private canvas: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;

  private cache: Map<number, string> = new Map();

  private isGenerating = false;

  private generationQueue: Array<{
    time: number;
    resolve: (url: string) => void;
    reject: (error: Error) => void;
    priority: number;
  }> = [];

  private currentAbortController: AbortController | null = null;

  private currentGeneratingTime: number | null = null;

  private currentPriority: number = 0;

  private readonly thumbnailWidth = 240;

  private readonly thumbnailHeight = 135;

  private readonly maxCacheSize = 200;

  private readonly jpegQuality = 0.7;

  private readonly seekTimeout = 1200;

  private readonly maxPreCachedFrames = 150;

  private preCachingStarted = false;

  private preCacheStep = 10;

  private isDestroyed = false;

  constructor() {
    this.initCanvas();
  }

  private initCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.thumbnailWidth;
    this.canvas.height = this.thumbnailHeight;
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    } else {
      log.error('Failed to get canvas context');
    }
  }

  private async getOrCreateSeekVideo(): Promise<HTMLVideoElement> {
    if (this.seekVideo && this.seekVideoReady) {
      return this.seekVideo;
    }

    if (!this.videoSrc) {
      throw new Error('No video source');
    }

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.style.cssText =
        'display:none;position:absolute;pointer-events:none;';

      const timeout = setTimeout(() => {
        video.remove();
        reject(new Error('Seek video metadata timeout'));
      }, 5000);

      video.addEventListener(
        'loadedmetadata',
        () => {
          clearTimeout(timeout);
          this.seekVideo = video;
          this.seekVideoReady = true;
          resolve(video);
        },
        { once: true },
      );

      video.addEventListener(
        'error',
        () => {
          clearTimeout(timeout);
          video.remove();
          reject(new Error('Seek video load error'));
        },
        { once: true },
      );

      video.src = this.videoSrc!;
      document.body.appendChild(video);
    });
  }

  private destroySeekVideo(): void {
    if (this.seekVideo) {
      this.seekVideo.src = '';
      this.seekVideo.load();
      this.seekVideo.remove();
      this.seekVideo = null;
    }
    this.seekVideoReady = false;
  }

  private async generateThumbnailInternal(
    time: number,
    signal: AbortSignal,
  ): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not initialized');
    }

    const video = await this.getOrCreateSeekVideo();

    if (signal.aborted) throw new Error('Aborted');

    if (Math.abs(video.currentTime - time) > 0.5) {
      if ('fastSeek' in video) {
        (video as any).fastSeek(time);
      } else {
        // @ts-ignore
        video.currentTime = time;
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(resolve, this.seekTimeout);

        const onSeeked = () => {
          clearTimeout(timeout);
          resolve();
        };

        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          video.removeEventListener('seeked', onSeeked);
          reject(new Error('Aborted'));
        });

        video.addEventListener('seeked', onSeeked, { once: true });
      });
    }

    if (signal.aborted) throw new Error('Aborted');

    this.ctx.drawImage(video, 0, 0, this.thumbnailWidth, this.thumbnailHeight);
    const dataUrl = this.canvas.toDataURL('image/jpeg', this.jpegQuality);

    this.addToCache(time, dataUrl);
    return dataUrl;
  }

  private addToCache(time: number, dataUrl: string): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(time, dataUrl);
  }

  private async processQueue(): Promise<void> {
    if (this.isGenerating || this.generationQueue.length === 0) {
      return;
    }

    this.isGenerating = true;

    // eslint-disable-next-line no-await-in-loop
    while (this.generationQueue.length > 0) {
      this.generationQueue.sort((a, b) => b.priority - a.priority);

      const request = this.generationQueue.shift();
      if (!request) break;

      const abort = new AbortController();
      this.currentAbortController = abort;
      this.currentGeneratingTime = request.time;
      this.currentPriority = request.priority;

      try {
        // eslint-disable-next-line no-await-in-loop
        const dataUrl = await this.generateThumbnailInternal(
          request.time,
          abort.signal,
        );
        request.resolve(dataUrl);
      } catch (error: any) {
        if (error?.message !== 'Aborted') {
          request.reject(error as Error);
        } else {
          request.reject(new Error('Aborted'));
        }
      } finally {
        if (this.currentAbortController === abort) {
          this.currentAbortController = null;
        }
        this.currentGeneratingTime = null;
        this.currentPriority = 0;
      }
    }

    this.isGenerating = false;
  }

  /**
   * Запоминает источник. Скрытый video создаётся лениво, при первом кадре,
   * чтобы не тянуть второй поток параллельно с основным воспроизведением.
   */
  loadVideo(src: string): void {
    log.debug('Video source set:', src);

    if (this.videoSrc !== src) {
      this.destroySeekVideo();
      this.cache.clear();
      this.generationQueue = [];
      this.currentAbortController?.abort();
      this.preCachingStarted = false;
    }

    this.videoSrc = src;
  }

  /**
   * Фоновая генерация превью по всей длительности. Запускается один раз
   * на источник — по первому наведению на прогресс-бар, не при загрузке видео.
   */
  startPreCaching(duration: number, intervalSeconds?: number): void {
    if (duration <= 0 || !this.videoSrc || this.preCachingStarted) return;

    this.preCachingStarted = true;

    const step = Math.max(
      intervalSeconds ?? 10,
      Math.ceil(duration / this.maxPreCachedFrames),
    );
    this.preCacheStep = step;

    this.generationQueue = this.generationQueue.filter(
      (item) => item.priority !== 1,
    );

    const times: number[] = [];
    for (let t = 0; t < duration; t += step) {
      const roundedTime = Math.floor(t);
      if (!this.cache.has(roundedTime)) {
        times.push(roundedTime);
      }
    }

    if (times.length === 0) return;

    log.debug(`Pre-caching ${times.length} frames every ${step}s`);

    times.forEach((time) => {
      // eslint-disable-next-line no-new
      new Promise<string>((resolve, reject) => {
        this.generationQueue.push({ time, resolve, reject, priority: 1 });
      }).catch(() => {});
    });

    this.processQueue();
  }

  getExactCached(time: number): string | null {
    return this.cache.get(Math.floor(time)) || null;
  }

  async getThumbnail(time: number, priority: number = 10): Promise<string> {
    if (this.isDestroyed) {
      throw new Error('ThumbnailManager is destroyed');
    }

    if (!this.videoSrc) {
      throw new Error('Video source not set');
    }

    const roundedTime = Math.floor(time);

    const cached = this.cache.get(roundedTime);
    if (cached) return cached;

    this.generationQueue = this.generationQueue.filter(
      (item) => item.priority === 1,
    );

    if (this.currentAbortController && this.currentPriority < priority) {
      this.currentAbortController.abort();
    }

    return new Promise((resolve, reject) => {
      this.generationQueue.push({
        time: roundedTime,
        resolve,
        reject,
        priority,
      });
      this.processQueue();
    });
  }

  getNearestCached(time: number): string | null {
    if (this.cache.size === 0) return null;

    const roundedTime = Math.floor(time);

    const exact = this.cache.get(roundedTime);
    if (exact) return exact;

    let nearestTime = -1;
    let nearestDiff = Infinity;

    this.cache.forEach((_, cachedTime) => {
      const diff = Math.abs(cachedTime - roundedTime);
      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearestTime = cachedTime;
      }
    });

    if (nearestTime >= 0 && nearestDiff <= Math.max(15, this.preCacheStep)) {
      return this.cache.get(nearestTime) || null;
    }

    return null;
  }

  clearCache(): void {
    log.debug('Clearing cache');
    this.generationQueue.forEach((item) =>
      item.reject(new Error('Cache cleared')),
    );
    this.generationQueue = [];
    this.isGenerating = false;
    this.currentAbortController?.abort();
    this.cache.clear();
    this.preCachingStarted = false;
  }

  destroy(): void {
    log.debug('Destroying');
    this.isDestroyed = true;
    this.clearCache();
    this.destroySeekVideo();

    if (this.canvas) {
      this.ctx = null;
      this.canvas = null;
    }

    this.videoSrc = null;
  }
}

export default ThumbnailManager;
