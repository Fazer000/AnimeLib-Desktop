import shaka from 'shaka-player/dist/shaka-player.ui';
import { OFFLINE_SCHEME } from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('ShakaPlayerManager');

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
  private static schemeRegistered: boolean = false;

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
      log.debug('Already initialized');
      return true;
    }

    this.videoElement = videoElement;

    try {
      log.debug('Starting initialization...');

      shaka.polyfill.installAll();
      ShakaPlayerManager.registerOfflineScheme();

      if (!shaka.Player.isBrowserSupported()) {
        log.error('Browser not supported!');
        this.config.onError?.('Браузер не поддерживается');
        return false;
      }

      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('preload', 'auto');

      if ('requestVideoFrameCallback' in videoElement) {
        log.debug('requestVideoFrameCallback available');
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

            log.debug('Request filter applied for Kodik');
          }
        });

      this.player
        .getNetworkingEngine()
        ?.registerResponseFilter((type, response) => {
          if (response.uri?.includes('kodik')) {
            log.debug('Response from Kodik:', response.status);
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
          forceTransmux: false,
        },
      });

      this.player.addEventListener('error', (event: any) => {
        const error = event.detail;
        log.error('Error details:', {
          code: error.code,
          category: error.category,
          severity: error.severity,
          data: error.data,
          message: error.message,
        });

        if (error.severity === 1) {
          log.warn('Recoverable error, ignoring');
          return;
        }

        this.config.onError?.(ShakaPlayerManager.describeError(error));
        this.setLoading(false);
      });

      this.player.addEventListener('buffering', (event: any) => {
        const isBuffering = event.buffering;
        if (isBuffering) {
          log.debug('Buffering started');
        } else {
          log.debug('Buffering ended');
        }
        this.config.onBufferingChange?.(isBuffering);
      });

      this.player.addEventListener('adaptation', () => {
        const activeVariant = this.player
          ?.getVariantTracks()
          .find((track) => track.active);
        if (activeVariant) {
          const bandwidth = Math.round((activeVariant.bandwidth || 0) / 1000);
          log.debug(
            `Quality adapted to: ${activeVariant.height}p @ ${bandwidth}kbps`,
          );
        }
      });

      this.player.addEventListener('abrstatuschanged', (event: any) => {
        log.debug('ABR status:', event.status);
      });

      this.player.addEventListener('streaming', () => {
        log.debug('Streaming event triggered');
      });

      this.isInitialized = true;
      log.debug('Initialized successfully with performance monitoring');
      return true;
    } catch (error) {
      log.error('Initialization error:', error);
      this.config.onError?.('Ошибка инициализации плеера');
      return false;
    }
  }

  /**
   * Регистрирует схему локальных файлов в networking engine
   */
  private static registerOfflineScheme(): void {
    if (ShakaPlayerManager.schemeRegistered) {
      return;
    }

    try {
      const plugin = shaka.net.HttpFetchPlugin.isSupported()
        ? shaka.net.HttpFetchPlugin.parse
        : shaka.net.HttpXHRPlugin.parse;

      shaka.net.NetworkingEngine.registerScheme(
        OFFLINE_SCHEME,
        plugin,
        shaka.net.NetworkingEngine.PluginPriority.PREFERRED,
        true,
      );

      ShakaPlayerManager.schemeRegistered = true;
      log.debug('Offline scheme registered');
    } catch (error) {
      log.error('Scheme registration failed:', error);
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
   * Возвращает текст ошибки по коду и категории Shaka
   */
  private static describeError(error: any): string {
    const messages: Record<number, string> = {
      3015: 'Ошибка загрузки HLS плейлиста. Попробуйте другой плеер.',
      3016: 'Ошибка декодирования видео. Попробуйте другое качество.',
      3017: 'Не хватает памяти буфера. Перезапустите плеер.',
      3018: 'Не удалось преобразовать поток. Скачайте серию заново или выберите другой плеер.',
    };

    if (messages[error.code]) {
      return messages[error.code];
    }

    if (error.category === 1) {
      return 'Ошибка сети. Проверьте интернет-соединение.';
    }

    if (error.category === 4) {
      return 'Ошибка разбора манифеста. Попробуйте другое качество.';
    }

    if (error.category === 3) {
      return 'Ошибка воспроизведения медиапотока.';
    }

    return 'Ошибка загрузки видео';
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
    log.debug('Load cancelled, newer request is active');
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
      log.error('Player not initialized');
      return false;
    }

    this.loadToken += 1;
    const token = this.loadToken;

    log.debug('Loading video:', qualityOption.label);
    this.setLoading(true);

    try {
      await this.player.unload();
      if (this.isStaleLoad(token)) {
        return false;
      }

      if (qualityOption.src.startsWith(`${OFFLINE_SCHEME}://`)) {
        log.debug('Loading offline file:', qualityOption.src);

        if (qualityOption.type === 'hls') {
          const loaded = await this.loadWithRetry(qualityOption.src, token);

          if (this.isStaleLoad(token)) {
            return false;
          }

          if (!loaded) {
            throw new Error('Ошибка загрузки локального плейлиста');
          }

          await this.waitForCanPlay();
          this.setLoading(false);

          if (savedTime !== undefined && savedTime > 0) {
            await this.seekWhenReady(savedTime);
          }

          if (autoplay) {
            this.videoElement?.play().catch(() => undefined);
          }

          return true;
        }

        const nativeLoaded = await this.loadNativeSource(qualityOption.src);
        if (this.isStaleLoad(token)) {
          return false;
        }

        if (!nativeLoaded) {
          log.error('Offline file failed, falling back to online');

          const fallbacks = [
            qualityOption.fallbackSrc,
            qualityOption.fallbackSrc2,
          ].filter(Boolean) as string[];

          const loaded =
            fallbacks.length > 0 &&
            (await this.tryProgressiveSourcesWithRetry(fallbacks, token));

          if (!loaded) {
            throw new Error('Ошибка загрузки локального файла');
          }
        }
      } else if (qualityOption.type === 'hls') {
        log.debug('Loading HLS:', qualityOption.src);
        log.debug('HLS type detected, using Shaka Player');

        const loaded = await this.loadWithRetry(qualityOption.src, token);
        if (this.isStaleLoad(token)) {
          return false;
        }
        if (!loaded) {
          log.error('Failed to load HLS with Shaka, trying native fallback');

          if (
            this.videoElement &&
            this.videoElement.canPlayType('application/vnd.apple.mpegurl')
          ) {
            log.debug('Using native HLS playback');
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

      log.debug('Video loaded, waiting for canplay event...');
      await this.waitForCanPlay();
      if (this.isStaleLoad(token)) {
        return false;
      }
      log.debug('Video is ready to play');

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
            log.debug('Autoplay prevented:', error.name);
          });
        }, 100);
      }

      return true;
    } catch (error: any) {
      if (this.isStaleLoad(token)) {
        return false;
      }
      log.error('Load error:', error);
      this.config.onError?.(error.message || 'Ошибка загрузки видео');
      this.setLoading(false);
      return false;
    }
  }

  /**
   * Загружает источник напрямую в video без Shaka
   */
  private loadNativeSource(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const video = this.videoElement;

      if (!video) {
        resolve(false);
        return;
      }

      const finish = (result: boolean) => {
        // eslint-disable-next-line no-use-before-define
        video.removeEventListener('loadeddata', onLoaded);
        // eslint-disable-next-line no-use-before-define
        video.removeEventListener('error', onFailed);
        // eslint-disable-next-line no-use-before-define
        clearTimeout(timer);
        resolve(result);
      };

      const onLoaded = () => finish(true);
      const onFailed = () => finish(false);
      const timer = setTimeout(() => finish(video.readyState >= 2), 15000);

      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('error', onFailed);

      video.src = src;
      video.load();
    });
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
        log.debug(`Attempt ${attempt}/${this.maxRetries} for: ${src}`);

        const networkEngine = this.player?.getNetworkingEngine();
        log.debug('Network engine available:', !!networkEngine);

        // eslint-disable-next-line no-await-in-loop
        await this.player?.load(src);
        log.debug('Successfully loaded:', src);
        return true;
      } catch (error: any) {
        log.error(`Attempt ${attempt} failed:`, {
          code: error.code,
          category: error.category,
          message: error.message,
          data: error.data,
        });

        if (attempt < this.maxRetries) {
          log.debug(`Retrying in ${this.retryDelay}ms...`);
          // eslint-disable-next-line no-await-in-loop
          await ShakaPlayerManager.delay(this.retryDelay);
        } else {
          log.error('All retry attempts exhausted for:', src);
          log.error('Final error details:', error);
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
      log.debug(`Trying source ${i + 1}/${sources.length}:`, src);

      // eslint-disable-next-line no-await-in-loop
      const loaded = await this.loadWithRetry(src, token);
      if (loaded) {
        return true;
      }

      if (i < sources.length - 1) {
        log.debug('Moving to next source...');
      }
    }

    log.error('All sources exhausted after retries');
    return false;
  }

  /**
   * Ожидает готовности видео (canplay event)
   */
  private async waitForCanPlay(): Promise<void> {
    if (!this.videoElement) {
      log.warn('No video element to wait for');
      return Promise.resolve();
    }

    if (this.videoElement.readyState >= 3) {
      log.debug('Video already ready');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const handleCanPlay = () => {
        log.debug('canplay event received');
        resolve();
      };

      const timeout = setTimeout(() => {
        log.warn('canplay timeout, continuing anyway');
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
        log.debug('Restored time to:', time);
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
        log.error('Unload error:', error);
      }
    }
  }

  /**
   * Отвязывает источник, прекращая сетевые запросы
   */
  async detachSource(): Promise<void> {
    this.loadToken += 1;
    this.setLoading(false);

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
    }

    if (this.player) {
      try {
        await this.player.unload();
      } catch (error) {
        log.error('Detach error:', error);
      }
    }

    this.videoElement?.load();
    log.debug('Source detached');
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
      log.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Уничтожает плеер
   */
  async destroy(): Promise<void> {
    log.debug('Destroying player');

    if (this.player) {
      try {
        await this.player.destroy();
      } catch (error) {
        log.error('Destroy error:', error);
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
