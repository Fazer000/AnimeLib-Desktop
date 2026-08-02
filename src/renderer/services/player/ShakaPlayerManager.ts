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
  onBufferingChange?: (isBuffering: boolean) => void;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Управляет инициализацией и работой Shaka Player
 */
export class ShakaPlayerManager {
  private player: shaka.Player | null = null;

  private videoElement: HTMLVideoElement | null = null;

  private isInitialized: boolean = false;

  private isLoading: boolean = false;

  private loadToken: number = 0;

  private config: ShakaPlayerConfig;

  private maxRetries: number;

  private retryDelay: number;

  constructor(config: ShakaPlayerConfig = {}) {
    this.config = config;
    this.maxRetries = config.maxRetries ?? 5;
    this.retryDelay = config.retryDelay ?? 2000;
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

      shaka.polyfill.installAll();

      if (!shaka.Player.isBrowserSupported()) {
        console.error('[ShakaPlayerManager] Browser not supported!');
        this.config.onError?.('Браузер не поддерживается');
        return false;
      }

      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('preload', 'auto');

      if ('requestVideoFrameCallback' in videoElement) {
        console.log('[ShakaPlayerManager] requestVideoFrameCallback available');
      }

      this.player = new shaka.Player();
      await this.player.attach(videoElement);

      this.player
        .getNetworkingEngine()
        ?.registerRequestFilter((type, request) => {
          if (request.uris[0]?.includes('kodik')) {
            request.allowCrossSiteCredentials = true;
            request.headers = request.headers || {};

            request.headers.Accept = '*/*';
            request.headers['Accept-Language'] =
              'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7';

            console.log(
              '[ShakaPlayerManager] Request filter applied for Kodik',
            );
          }
        });

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

      this.player.configure({
        streaming: {
          retryParameters: {
            maxAttempts: 5,
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 45000,
          },
          bufferingGoal: 30,
          rebufferingGoal: 2,
          bufferBehind: 30,

          segmentPrefetchLimit: 2,

          stallEnabled: true,
          stallThreshold: 1,
          stallSkip: 0.1,

          safeSeekOffset: 5,

          lowLatencyMode: false,

          ignoreTextStreamFailures: true,
          alwaysStreamText: false,

          startAtSegmentBoundary: false,

          preferNativeHls: true,

          inaccurateManifestTolerance: 2,
        },

        manifest: {
          retryParameters: {
            maxAttempts: 5,
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 45000,
          },
          availabilityWindowOverride: 60,
          disableAudio: false,
          disableVideo: false,
          disableText: true,
          defaultPresentationDelay: 10,
          hls: {
            ignoreManifestProgramDateTime: false,
          },
        },

        abr: {
          enabled: true,
          useNetworkInformation: true,
          defaultBandwidthEstimate: 5000000,
          switchInterval: 8,
          bandwidthUpgradeTarget: 0.85,
          bandwidthDowngradeTarget: 0.95,
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

        preferredAudioLanguage: 'ru',
        preferredTextLanguage: 'ru',
        preferredAudioRole: '',
        preferredTextRole: '',
        preferForcedSubs: false,

        drm: {
          retryParameters: {
            maxAttempts: 2,
            baseDelay: 1000,
            backoffFactor: 2,
            fuzzFactor: 0.5,
            timeout: 30000,
          },
        },

        mediaSource: {
          forceTransmux: true,
        },
      });

      this.player.addEventListener('error', (event: any) => {
        const error = event.detail;
        console.error('[ShakaPlayerManager] Error details:', {
          code: error.code,
          category: error.category,
          severity: error.severity,
          data: error.data,
          message: error.message,
        });

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

      this.player.addEventListener('buffering', (event: any) => {
        const isBuffering = event.buffering;
        if (isBuffering) {
          console.log('[ShakaPlayerManager] Buffering started');
        } else {
          console.log('[ShakaPlayerManager] Buffering ended');
        }
        this.config.onBufferingChange?.(isBuffering);
      });

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

      this.player.addEventListener('abrstatuschanged', (event: any) => {
        console.log('[ShakaPlayerManager] ABR status:', event.status);
      });

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
   * Отменяет текущую загрузку видео
   */
  cancelLoad(): void {
    this.loadToken += 1;
    this.setLoading(false);
  }

  /**
   * Проверяет, не вытеснена ли загрузка более новой
   */
  private isStaleLoad(token: number): boolean {
    if (token === this.loadToken) {
      return false;
    }
    console.log('[ShakaPlayerManager] Load cancelled, newer request is active');
    return true;
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

    this.loadToken += 1;
    const token = this.loadToken;

    console.log('[ShakaPlayerManager] Loading video:', qualityOption.label);
    this.setLoading(true);

    try {
      await this.player.unload();
      if (this.isStaleLoad(token)) {
        return false;
      }

      if (qualityOption.type === 'hls') {
        console.log('[ShakaPlayerManager] Loading HLS:', qualityOption.src);
        console.log(
          '[ShakaPlayerManager] HLS type detected, using Shaka Player',
        );

        const loaded = await this.loadWithRetry(qualityOption.src, token);
        if (this.isStaleLoad(token)) {
          return false;
        }
        if (!loaded) {
          console.error(
            '[ShakaPlayerManager] Failed to load HLS with Shaka, trying native fallback',
          );

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
        const sources = [
          qualityOption.src,
          qualityOption.fallbackSrc,
          qualityOption.fallbackSrc2,
        ].filter(Boolean) as string[];

        const loaded = await this.tryProgressiveSourcesWithRetry(
          sources,
          token,
        );
        if (this.isStaleLoad(token)) {
          return false;
        }
        if (!loaded) {
          throw new Error('Ошибка загрузки всех источников видео');
        }
      }

      console.log(
        '[ShakaPlayerManager] Video loaded, waiting for canplay event...',
      );
      await this.waitForCanPlay();
      if (this.isStaleLoad(token)) {
        return false;
      }
      console.log('[ShakaPlayerManager] Video is ready to play');

      this.setLoading(false);

      if (savedTime !== undefined && savedTime > 0) {
        await this.seekWhenReady(savedTime);
      }

      if (autoplay && this.videoElement) {
        setTimeout(() => {
          if (this.isStaleLoad(token)) {
            return;
          }
          this.videoElement?.play().catch((error: any) => {
            console.log('[ShakaPlayerManager] Autoplay prevented:', error.name);
          });
        }, 100);
      }

      return true;
    } catch (error: any) {
      if (this.isStaleLoad(token)) {
        return false;
      }
      console.error('[ShakaPlayerManager] Load error:', error);
      this.config.onError?.(error.message || 'Ошибка загрузки видео');
      this.setLoading(false);
      return false;
    }
  }

  /**
   * Загружает один источник с несколькими попытками
   */
  private async loadWithRetry(src: string, token: number): Promise<boolean> {
    // eslint-disable-next-line no-plusplus
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      if (this.isStaleLoad(token)) {
        return false;
      }

      try {
        console.log(
          `[ShakaPlayerManager] Attempt ${attempt}/${this.maxRetries} for: ${src}`,
        );

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
    token: number,
  ): Promise<boolean> {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < sources.length; i++) {
      if (this.isStaleLoad(token)) {
        return false;
      }

      const src = sources[i];
      console.log(
        `[ShakaPlayerManager] Trying source ${i + 1}/${sources.length}:`,
        src,
      );

      // eslint-disable-next-line no-await-in-loop
      const loaded = await this.loadWithRetry(src, token);
      if (loaded) {
        return true;
      }

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

    if (this.videoElement.readyState >= 3) {
      console.log('[ShakaPlayerManager] Video already ready');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const handleCanPlay = () => {
        console.log('[ShakaPlayerManager] canplay event received');
        resolve();
      };

      const timeout = setTimeout(() => {
        console.warn('[ShakaPlayerManager] canplay timeout, continuing anyway');
        this.videoElement?.removeEventListener('canplay', handleCanPlay);
        resolve();
      }, 5000);

      this.videoElement?.addEventListener('canplay', handleCanPlay, {
        once: true,
      });

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
    this.loadToken += 1;

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
