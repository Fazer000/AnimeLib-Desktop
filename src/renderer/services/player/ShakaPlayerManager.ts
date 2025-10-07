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
    this.maxRetries = config.maxRetries ?? 5; // По умолчанию 5 попыток для Kodik
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

      // Optimize video element for performance
      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('preload', 'auto');

      // Enable hardware acceleration hints
      if ('requestVideoFrameCallback' in videoElement) {
        console.log('[ShakaPlayerManager] requestVideoFrameCallback available');
      }

      // Create player instance
      this.player = new shaka.Player();
      await this.player.attach(videoElement);

      // Register network filters for Kodik HLS support
      this.player
        .getNetworkingEngine()
        ?.registerRequestFilter((type, request) => {
          // Add headers for HLS requests
          if (request.uris[0]?.includes('kodik')) {
            request.allowCrossSiteCredentials = true;
            request.headers = request.headers || {};

            // Only add safe headers that won't be blocked
            request.headers.Accept = '*/*';
            request.headers['Accept-Language'] =
              'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7';

            console.log(
              '[ShakaPlayerManager] Request filter applied for Kodik',
            );
          }
        });

      // Register response filter to handle errors gracefully
      this.player
        .getNetworkingEngine()
        ?.registerResponseFilter((type, response) => {
          if (response.uri?.includes('kodik')) {
            console.log(
              '[ShakaPlayerManager] Response from Kodik:',
              response.status,
            );
          }
        });

      // Configure player with performance optimizations
      this.player.configure({
        streaming: {
          retryParameters: {
            maxAttempts: 5, // Увеличиваем попытки для Kodik
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 45000, // Увеличиваем таймаут до 45 сек
          },
          // Buffer settings - оптимизированы для плавного воспроизведения
          bufferingGoal: 30, // Увеличен буфер для плавности (30 сек)
          rebufferingGoal: 2, // Быстрое восстановление после ребуферинга
          bufferBehind: 30, // Держим 30 сек позади для перемотки назад

          // Segment prefetch для более быстрой загрузки
          segmentPrefetchLimit: 2, // Предзагружаем 2 сегмента вперёд

          // Stall detection - быстрое обнаружение зависаний
          stallEnabled: true,
          stallThreshold: 1, // Обнаружение зависания через 1 сек
          stallSkip: 0.1, // Пропускаем 0.1 сек при зависании

          // Safe margin для избежания ребуферинга
          safeSeekOffset: 5, // 5 сек безопасный отступ

          // Low latency оптимизации
          lowLatencyMode: false, // Отключаем для Kodik
          autoLowLatencyMode: false,

          // Force transmux для лучшей совместимости с Kodik
          forceTransmux: true, // Включаем transmuxing для HLS

          // Ignore text stream failures
          ignoreTextStreamFailures: true,
          alwaysStreamText: false,

          // Start at high quality
          startAtSegmentBoundary: false,

          // Fast switching между качествами
          useNativeHlsOnSafari: true,

          // HLS-specific settings for better compatibility
          inaccurateManifestTolerance: 2,
          rebufferingGoalBackoffFactor: 1.2,
        },

        manifest: {
          retryParameters: {
            maxAttempts: 5, // Увеличиваем попытки для манифеста
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 45000, // Увеличиваем таймаут
          },
          // Быстрое обновление манифеста
          availabilityWindowOverride: 60,
          disableAudio: false,
          disableVideo: false,
          disableText: true, // Отключаем субтитры для производительности
          defaultPresentationDelay: 10,
          // HLS-specific settings для Kodik
          hls: {
            useFullSegmentsForStartTime: true,
            ignoreManifestProgramDateTime: false,
          },
        },

        // ABR (Adaptive Bitrate) оптимизации
        abr: {
          enabled: true,
          useNetworkInformation: true, // Используем Network Information API
          defaultBandwidthEstimate: 5000000, // 5 Mbps начальная оценка
          switchInterval: 8, // Переключение каждые 8 сек
          bandwidthUpgradeTarget: 0.85, // Повышаем качество при 85% запаса
          bandwidthDowngradeTarget: 0.95, // Понижаем при 95% использования
          restrictions: {
            minWidth: 0,
            maxWidth: Infinity,
            minHeight: 0,
            maxHeight: Infinity,
            minPixels: 0,
            maxPixels: Infinity,
            minFrameRate: 0,
            maxFrameRate: Infinity,
            minBandwidth: 0,
            maxBandwidth: Infinity,
          },
        },

        // Preferenced settings для оптимизации
        preferredAudioLanguage: 'ru',
        preferredTextLanguage: 'ru',
        preferredVariantRole: '',
        preferredAudioRole: '',
        preferredTextRole: '',
        preferForcedSubs: false,

        // Streaming protocol settings
        drm: {
          retryParameters: {
            maxAttempts: 2,
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 30000,
          },
        },

        // MediaSource configuration
        mediaSource: {
          // Не используем sourceBufferExtraFeatures, т.к. это вызывает ошибки с MIME типами
          forceTransmuxTS: true, // Форсировать transmux для TS сегментов
        },
      });

      // Setup error handler
      this.player.addEventListener('error', (event: any) => {
        const error = event.detail;
        console.error('[ShakaPlayerManager] Error details:', {
          code: error.code,
          category: error.category,
          severity: error.severity,
          data: error.data,
          message: error.message,
        });

        // Provide more specific error messages
        let errorMessage = 'Ошибка загрузки видео';
        if (error.code === 3015) {
          errorMessage =
            'Ошибка загрузки HLS плейлиста. Попробуйте другой плеер.';
        } else if (error.category === 1) {
          errorMessage = 'Ошибка сети. Проверьте интернет-соединение.';
        } else if (error.category === 3) {
          errorMessage =
            'Ошибка парсинга манифеста. Попробуйте другое качество.';
        }

        this.config.onError?.(errorMessage);
        this.setLoading(false);
      });

      // Performance monitoring - buffering events
      this.player.addEventListener('buffering', (event: any) => {
        const isBuffering = event.buffering;
        if (isBuffering) {
          console.log('[ShakaPlayerManager] Buffering started');
        } else {
          console.log('[ShakaPlayerManager] Buffering ended');
        }
      });

      // Adaptation events - track quality changes
      this.player.addEventListener('adaptation', () => {
        const activeVariant = this.player
          ?.getVariantTracks()
          .find((track) => track.active);
        if (activeVariant) {
          const bandwidth = Math.round((activeVariant.bandwidth || 0) / 1000);
          console.log(
            `[ShakaPlayerManager] Quality adapted to: ${activeVariant.height}p @ ${bandwidth}kbps`,
          );
        }
      });

      // ABR status changes
      this.player.addEventListener('abrstatuschanged', (event: any) => {
        console.log('[ShakaPlayerManager] ABR status:', event.status);
      });

      // Streaming event for advanced monitoring
      this.player.addEventListener('streaming', () => {
        console.log('[ShakaPlayerManager] Streaming event triggered');
      });

      this.isInitialized = true;
      console.log(
        '[ShakaPlayerManager] Initialized successfully with performance monitoring',
      );
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
        console.log(
          '[ShakaPlayerManager] HLS type detected, using Shaka Player',
        );

        const loaded = await this.loadWithRetry(qualityOption.src);
        if (!loaded) {
          console.error(
            '[ShakaPlayerManager] Failed to load HLS with Shaka, trying native fallback',
          );

          // Try native HLS as fallback for Safari/iOS
          if (
            this.videoElement &&
            this.videoElement.canPlayType('application/vnd.apple.mpegurl')
          ) {
            console.log('[ShakaPlayerManager] Using native HLS playback');
            await this.player.unload();
            this.videoElement.src = qualityOption.src;
            this.videoElement.load();
            return true;
          }

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

        // Log network engine status
        const networkEngine = this.player?.getNetworkingEngine();
        console.log(
          '[ShakaPlayerManager] Network engine available:',
          !!networkEngine,
        );

        // eslint-disable-next-line no-await-in-loop
        await this.player?.load(src);
        console.log('[ShakaPlayerManager] Successfully loaded:', src);
        return true;
      } catch (error: any) {
        console.error(`[ShakaPlayerManager] Attempt ${attempt} failed:`, {
          code: error.code,
          category: error.category,
          message: error.message,
          data: error.data,
        });

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
          console.error('[ShakaPlayerManager] Final error details:', error);
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
   * Получает статистику производительности плеера
   */
  getStats(): any {
    if (!this.player) {
      return null;
    }

    try {
      const stats = this.player.getStats();
      const bufferedInfo = this.player.getBufferedInfo();

      return {
        ...stats,
        bufferedInfo,
        estimatedBandwidth: stats.estimatedBandwidth,
        streamBandwidth: stats.streamBandwidth,
        width: stats.width,
        height: stats.height,
        decodedFrames: stats.decodedFrames,
        droppedFrames: stats.droppedFrames,
        corruptedFrames: stats.corruptedFrames,
        stallsDetected: stats.stallsDetected,
        gapsJumped: stats.gapsJumped,
      };
    } catch (error) {
      console.error('[ShakaPlayerManager] Error getting stats:', error);
      return null;
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
