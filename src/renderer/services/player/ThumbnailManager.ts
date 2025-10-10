/* eslint-disable no-console */

/**
 * ThumbnailManager - генерация превью через Range запросы
 *
 * Правильный подход как в YouTube:
 * - Загружаем ТОЛЬКО нужный сегмент видео (Range requests)
 * - Не трогаем основное видео
 * - Минимальная нагрузка на сервер
 * - Работает во время воспроизведения
 */
export class ThumbnailManager {
  private videoSrc: string | null = null;
  private seekVideo: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cache: Map<number, string> = new Map();
  private isGenerating = false;
  private generationQueue: Array<{
    time: number;
    resolve: (url: string) => void;
    reject: (error: Error) => void;
    priority?: number;
  }> = [];
  private lastGenerationTime = 0;
  private readonly throttleMs = 100;
  private readonly thumbnailWidth = 120;
  private readonly thumbnailHeight = 68;
  private readonly maxCacheSize = 200;
  private readonly jpegQuality = 0.5;
  private isDestroyed = false;
  private activeSeeks = new Map<HTMLVideoElement, AbortController>();

  constructor() {
    this.initCanvas();
  }

  /**
   * Инициализация canvas для захвата кадров
   */
  private initCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.thumbnailWidth;
    this.canvas.height = this.thumbnailHeight;
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false,
    });

    if (!this.ctx) {
      console.error('[ThumbnailManager] Failed to get canvas context');
    }
  }

  /**
   * Создание временного видео для превью с Range запросом
   */
  private createSeekVideo(src: string, targetTime: number): {
    video: HTMLVideoElement;
    abort: AbortController;
  } {
    const video = document.createElement('video');
    const abort = new AbortController();

    video.crossOrigin = 'anonymous';
    video.preload = 'auto'; // Важно для загрузки сегмента
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';
    video.style.position = 'absolute';
    video.style.pointerEvents = 'none';

    // Устанавливаем время ДО загрузки для оптимизации
    video.currentTime = targetTime;
    video.src = src;

    this.activeSeeks.set(video, abort);
    document.body.appendChild(video);

    return { video, abort };
  }

  /**
   * Генерация превью для указанного времени
   */
  private async generateThumbnailInternal(time: number): Promise<string> {
    if (!this.videoSrc || !this.canvas || !this.ctx) {
      throw new Error('ThumbnailManager not initialized');
    }

    // Throttling
    const now = Date.now();
    if (now - this.lastGenerationTime < this.throttleMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.throttleMs - (now - this.lastGenerationTime)),
      );
    }

    this.lastGenerationTime = Date.now();

    // Создаём временное видео для этого seek'а
    const { video, abort } = this.createSeekVideo(this.videoSrc, time);

    try {
      // Ждём загрузку метаданных
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Metadata timeout'));
        }, 3000);

        const onLoadedMetadata = () => {
          clearTimeout(timeout);
          // Устанавливаем время после загрузки метаданных
          video.currentTime = time;
        };

        const onLoadedData = () => {
          clearTimeout(timeout);
          resolve();
        };

        const onError = () => {
          clearTimeout(timeout);
          reject(new Error('Video load error'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata, {
          once: true,
        });
        video.addEventListener('loadeddata', onLoadedData, { once: true });
        video.addEventListener('error', onError, { once: true });

        abort.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });

      // Seek к нужному времени если ещё не там
      if (Math.abs(video.currentTime - time) > 0.1) {
        video.currentTime = time;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Seeked timeout'));
          }, 2000);

          const onSeeked = () => {
            clearTimeout(timeout);
            resolve();
          };

          video.addEventListener('seeked', onSeeked, { once: true });

          abort.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Aborted'));
          });
        });
      }

      // Захват кадра
      this.ctx.drawImage(
        video,
        0,
        0,
        this.thumbnailWidth,
        this.thumbnailHeight,
      );

      // Конвертация в base64
      const dataUrl = this.canvas.toDataURL('image/jpeg', this.jpegQuality);

      // Сохранение в кэш
      this.addToCache(time, dataUrl);

      return dataUrl;
    } finally {
      // Очистка временного видео
      this.activeSeeks.delete(video);
      abort.abort();
      video.src = '';
      video.load();
      video.remove();
    }
  }

  /**
   * Добавление превью в кэш с LRU стратегией
   */
  private addToCache(time: number, dataUrl: string): void {
    // Если кэш переполнен, удаляем самый старый элемент
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(time, dataUrl);
  }

  /**
   * Обработка очереди генерации (с приоритетом)
   */
  private async processQueue(): Promise<void> {
    if (this.isGenerating || this.generationQueue.length === 0) {
      return;
    }

    this.isGenerating = true;

    while (this.generationQueue.length > 0) {
      // Сортируем по приоритету (больше = важнее)
      this.generationQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      const request = this.generationQueue.shift();
      if (!request) break;

      try {
        const dataUrl = await this.generateThumbnailInternal(request.time);
        request.resolve(dataUrl);
      } catch (error) {
        request.reject(error as Error);
      }
    }

    this.isGenerating = false;
  }

  /**
   * Загрузка видео источника
   */
  loadVideo(src: string): void {
    console.log('[ThumbnailManager] Video source set:', src);
    this.videoSrc = src;
  }

  /**
   * Получение превью (из кэша или генерация)
   */
  async getThumbnail(
    time: number,
    priority: number = 10,
  ): Promise<string> {
    if (this.isDestroyed) {
      throw new Error('ThumbnailManager is destroyed');
    }

    if (!this.videoSrc) {
      throw new Error('Video source not set');
    }

    // Округляем время
    const roundedTime = Math.floor(time);

    // Проверка кэша
    const cached = this.cache.get(roundedTime);
    if (cached) {
      return cached;
    }

    // Добавление в очередь
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


  /**
   * Очистка кэша
   */
  clearCache(): void {
    console.log('[ThumbnailManager] Clearing cache');

    // Отменяем все активные seek'и
    this.activeSeeks.forEach((abort) => abort.abort());
    this.activeSeeks.clear();

    this.cache.clear();
    this.generationQueue = [];
    this.isGenerating = false;
  }

  /**
   * Полное уничтожение менеджера
   */
  destroy(): void {
    console.log('[ThumbnailManager] Destroying');
    this.isDestroyed = true;

    // Очистка кэша и активных запросов
    this.clearCache();

    // Очистка canvas
    if (this.canvas) {
      this.ctx = null;
      this.canvas = null;
    }

    this.videoSrc = null;
  }
}

