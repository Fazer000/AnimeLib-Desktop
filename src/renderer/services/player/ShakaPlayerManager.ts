/* eslint-disable no-console */
import shaka from 'shaka-player/dist/shaka-player.ui';

export interface QualityOption {
  label: string;
  value: string;
  src: string;
  fallbackSrc?: string;
  fallbackSrc2?: string;
  type: 'progressive' | 'hls';
}

export interface ShakaPlayerConfig {
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  maxRetries?: number; // Максимальное количество попыток загрузки
  retryDelay?: number; // Задержка между попытками (мс)
}

/**
 * Управляет инициализацией и работой Shaka Player
 */
export class ShakaPlayerManager {
  private player: shaka.Player | null = null;

  private videoElement: HTMLVideoElement | null = null;

  private isInitialized: boolean = false;

  private isLoading: boolean = false;

  private config: ShakaPlayerConfig;

  private maxRetries: number;

  private retryDelay: number;

  constructor(config: ShakaPlayerConfig = {}) {
    this.config = config;
    this.maxRetries = config.maxRetries ?? 3; // По умолчанию 3 попытки
    this.retryDelay = config.retryDelay ?? 2000; // По умолчанию 2 секунды
  }

  /**
   * Инициализирует Shaka Player
   */
  async initialize(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.isInitialized && this.player) {
      console.log('[ShakaPlayerManager] Already initialized');
      return true;
    }

    this.videoElement = videoElement;

    try {
      console.log('[ShakaPlayerManager] Starting initialization...');

      // Install polyfills
      shaka.polyfill.installAll();

      // Check browser support
      if (!shaka.Player.isBrowserSupported()) {
        console.error('[ShakaPlayerManager] Browser not supported!');
        this.config.onError?.('Браузер не поддерживается');
        return false;
      }

      // Create player instance
      this.player = new shaka.Player();
      await this.player.attach(videoElement);

      // Configure player
      this.player.configure({
        streaming: {
          retryParameters: {
            maxAttempts: 3,
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 30000,
          },
          bufferingGoal: 10,
          rebufferingGoal: 1,
          bufferBehind: 5,
          lowLatencyMode: true,
        },
        manifest: {
          retryParameters: {
            maxAttempts: 3,
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 30000,
          },
        },
      });

      // Setup error handler
      this.player.addEventListener('error', (event: any) => {
        const error = event.detail;
        console.error('[ShakaPlayerManager] Error:', error);
        this.config.onError?.('Ошибка загрузки видео');
        this.setLoading(false);
      });

      this.isInitialized = true;
      console.log('[ShakaPlayerManager] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[ShakaPlayerManager] Initialization error:', error);
      this.config.onError?.('Ошибка инициализации плеера');
      return false;
    }
  }

  /**
   * Задержка перед повторной попыткой
   */
  private static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Загружает видео с автоматическим fallback и retry логикой
   */
  async loadVideo(
    qualityOption: QualityOption,
    savedTime?: number,
    autoplay: boolean = false,
  ): Promise<boolean> {
    if (!this.player || !this.videoElement) {
      console.error('[ShakaPlayerManager] Player not initialized');
      return false;
    }

    console.log('[ShakaPlayerManager] Loading video:', qualityOption.label);
    this.setLoading(true);

    try {
      // Unload previous video
      await this.player.unload();

      if (qualityOption.type === 'hls') {
        // Load HLS manifest with retry
        console.log('[ShakaPlayerManager] Loading HLS:', qualityOption.src);
        const loaded = await this.loadWithRetry(qualityOption.src);
        if (!loaded) {
          throw new Error('Ошибка загрузки HLS после всех попыток');
        }
      } else {
        // Load progressive video with fallback support and retry
        const sources = [
          qualityOption.src,
          qualityOption.fallbackSrc,
          qualityOption.fallbackSrc2,
        ].filter(Boolean) as string[];

        const loaded = await this.tryProgressiveSourcesWithRetry(sources);
        if (!loaded) {
          throw new Error('Ошибка загрузки всех источников видео');
        }
      }

      // Wait for video to be ready before hiding loading indicator
      console.log(
        '[ShakaPlayerManager] Video loaded, waiting for canplay event...',
      );
      await this.waitForCanPlay();
      console.log('[ShakaPlayerManager] Video is ready to play');

      this.setLoading(false);

      // Restore time if provided
      if (savedTime !== undefined && savedTime > 0) {
        await this.seekWhenReady(savedTime);
      }

      // Autoplay if requested
      if (autoplay && this.videoElement) {
        setTimeout(() => {
          this.videoElement?.play().catch((error: any) => {
            console.log('[ShakaPlayerManager] Autoplay prevented:', error.name);
          });
        }, 100);
      }

      return true;
    } catch (error: any) {
      console.error('[ShakaPlayerManager] Load error:', error);
      this.config.onError?.(error.message || 'Ошибка загрузки видео');
      this.setLoading(false);
      return false;
    }
  }

  /**
   * Загружает один источник с несколькими попытками
   */
  private async loadWithRetry(src: string): Promise<boolean> {
    // eslint-disable-next-line no-plusplus
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `[ShakaPlayerManager] Attempt ${attempt}/${this.maxRetries} for: ${src}`,
        );
        // eslint-disable-next-line no-await-in-loop
        await this.player?.load(src);
        console.log('[ShakaPlayerManager] Successfully loaded:', src);
        return true;
      } catch (error: any) {
        console.error(`[ShakaPlayerManager] Attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          console.log(
            `[ShakaPlayerManager] Retrying in ${this.retryDelay}ms...`,
          );
          // eslint-disable-next-line no-await-in-loop
          await ShakaPlayerManager.delay(this.retryDelay);
        } else {
          console.error(
            '[ShakaPlayerManager] All retry attempts exhausted for:',
            src,
          );
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Пробует загрузить progressive видео из нескольких источников с retry
   */
  private async tryProgressiveSourcesWithRetry(
    sources: string[],
  ): Promise<boolean> {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      console.log(
        `[ShakaPlayerManager] Trying source ${i + 1}/${sources.length}:`,
        src,
      );

      // Пробуем загрузить источник с retry
      // eslint-disable-next-line no-await-in-loop
      const loaded = await this.loadWithRetry(src);
      if (loaded) {
        return true;
      }

      // Если это не последний источник, переходим к следующему
      if (i < sources.length - 1) {
        console.log('[ShakaPlayerManager] Moving to next source...');
      }
    }

    console.error('[ShakaPlayerManager] All sources exhausted after retries');
    return false;
  }

  /**
   * Ожидает готовности видео (canplay event)
   */
  private async waitForCanPlay(): Promise<void> {
    if (!this.videoElement) {
      console.warn('[ShakaPlayerManager] No video element to wait for');
      return Promise.resolve();
    }

    // Если видео уже готово
    if (this.videoElement.readyState >= 3) {
      console.log('[ShakaPlayerManager] Video already ready');
      return Promise.resolve();
    }

    // Ждем события canplay
    return new Promise((resolve) => {
      const handleCanPlay = () => {
        console.log('[ShakaPlayerManager] canplay event received');
        resolve();
      };

      // Таймаут на случай если событие не придет
      const timeout = setTimeout(() => {
        console.warn('[ShakaPlayerManager] canplay timeout, continuing anyway');
        this.videoElement?.removeEventListener('canplay', handleCanPlay);
        resolve();
      }, 5000);

      this.videoElement?.addEventListener('canplay', handleCanPlay, {
        once: true,
      });

      // Очищаем таймаут когда событие придет
      this.videoElement?.addEventListener(
        'canplay',
        () => clearTimeout(timeout),
        { once: true },
      );
    });
  }

  /**
   * Ожидает готовности видео и выполняет seek
   */
  private async seekWhenReady(time: number): Promise<void> {
    if (!this.videoElement) return;

    const seek = () => {
      if (this.videoElement && this.videoElement.readyState >= 1) {
        this.videoElement.currentTime = time;
        console.log('[ShakaPlayerManager] Restored time to:', time);
      }
    };

    if (this.videoElement.readyState >= 1) {
      seek();
    } else {
      this.videoElement.addEventListener('loadedmetadata', seek, {
        once: true,
      });
    }
  }

  /**
   * Выгружает текущее видео
   */
  async unload(): Promise<void> {
    if (this.player) {
      try {
        await this.player.unload();
      } catch (error) {
        console.error('[ShakaPlayerManager] Unload error:', error);
      }
    }
  }

  /**
   * Уничтожает плеер
   */
  async destroy(): Promise<void> {
    console.log('[ShakaPlayerManager] Destroying player');

    if (this.player) {
      try {
        await this.player.destroy();
      } catch (error) {
        console.error('[ShakaPlayerManager] Destroy error:', error);
      }
      this.player = null;
    }

    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
      this.videoElement = null;
    }

    this.isInitialized = false;
    this.isLoading = false;
  }

  /**
   * Проверяет, инициализирован ли плеер
   */
  isReady(): boolean {
    return this.isInitialized && this.player !== null;
  }

  /**
   * Получает экземпляр плеера
   */
  getPlayer(): shaka.Player | null {
    return this.player;
  }

  /**
   * Устанавливает состояние загрузки
   */
  private setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.config.onLoadingChange?.(isLoading);
  }

  /**
   * Проверяет, загружается ли видео
   */
  getIsLoading(): boolean {
    return this.isLoading;
  }
}
