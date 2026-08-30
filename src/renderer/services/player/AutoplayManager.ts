import { createLogger } from '../../../shared/logger';

const log = createLogger('AutoplayManager');

export interface AutoplayConfig {
  enabled: boolean;
  onEpisodeChange?: (episodeIndex: number) => void;
}

export interface LoadContext {
  isVoiceChange: boolean;
  isEpisodeChange: boolean;
  hasBookmark: boolean;
  isFromHint: boolean;
  currentTime?: number;
}

/**
 * AutoplayManager - управление автопроигрыванием
 *
 * Отвечает за:
 * - Автопроигрывание при смене озвучки
 * - Автопереход к следующему эпизоду
 * - Логика первой загрузки
 */
export class AutoplayManager {
  private videoElement: HTMLVideoElement | null = null;

  private config: AutoplayConfig;

  private isFirstLoad: boolean = true;

  private hasBookmarkPending: boolean = false;

  private shouldAutoplayOnLoad: boolean = false;

  private canPlayHandler: (() => void) | null = null;

  private endedHandler: (() => void) | null = null;

  constructor(config: AutoplayConfig) {
    this.config = config;
  }

  /**
   * Прикрепить видео элемент
   */
  attachVideo(video: HTMLVideoElement): void {
    this.detachVideo();
    this.videoElement = video;
    log.debug('Video element attached');
  }

  /**
   * Отключить видео элемент
   */
  private detachVideo(): void {
    if (this.videoElement && this.canPlayHandler) {
      this.videoElement.removeEventListener('canplay', this.canPlayHandler);
      this.canPlayHandler = null;
    }
    if (this.videoElement && this.endedHandler) {
      this.videoElement.removeEventListener('ended', this.endedHandler);
      this.endedHandler = null;
    }
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(config: Partial<AutoplayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Установить статус первой загрузки
   */
  setFirstLoad(isFirst: boolean): void {
    this.isFirstLoad = isFirst;
  }

  /**
   * Установить статус ожидания закладки
   */
  setBookmarkPending(pending: boolean): void {
    this.hasBookmarkPending = pending;
  }

  /**
   * Проверить нужно ли автопроигрывание
   */
  private shouldAutoplay(): boolean {
    if (this.isFirstLoad) {
      log.debug('First load - skipping autoplay');
      return false;
    }

    if (this.hasBookmarkPending) {
      log.debug('Bookmark pending - skipping autoplay');
      return false;
    }

    return true;
  }

  /**
   * Определить нужно ли автовоспроизведение на основе контекста загрузки
   */
  determineAutoplay(context: LoadContext): boolean {
    log.debug('Determining autoplay:', context);

    if (this.isFirstLoad) {
      this.isFirstLoad = false;
      log.debug('First load - no autoplay');
      return false;
    }

    if (context.hasBookmark) {
      log.debug('Bookmark - autoplay enabled');
      return true;
    }

    if (context.isFromHint) {
      log.debug('From hint - autoplay enabled');
      return true;
    }

    if (context.isVoiceChange) {
      log.debug(
        'Voice change - preserving play state:',
        context.currentTime !== undefined,
      );
      return context.currentTime !== undefined;
    }

    log.debug('Default - no autoplay');
    return false;
  }

  /**
   * Запустить автопроигрывание при загрузке плеера
   */
  setupAutoplayOnLoad(): void {
    if (!this.videoElement) {
      log.warn('No video element');
      return;
    }

    if (this.canPlayHandler) {
      this.videoElement.removeEventListener('canplay', this.canPlayHandler);
    }

    if (!this.shouldAutoplayOnLoad) {
      log.debug('Autoplay not requested for this load');
      return;
    }

    this.canPlayHandler = () => {
      if (!this.videoElement) {
        return;
      }

      log.debug('Video ready - starting autoplay');

      setTimeout(() => {
        if (!this.videoElement || !this.videoElement.paused) {
          log.debug('Video already playing');
          return;
        }

        this.videoElement
          .play()
          .then(() => {
            log.debug('Autoplay started successfully');
            return undefined;
          })
          .catch((error) => {
            log.warn('Autoplay failed:', error);
          });
      }, 100);
    };

    this.videoElement.addEventListener('canplay', this.canPlayHandler);
  }

  /**
   * Установить флаг автовоспроизведения для следующей загрузки
   */
  setShouldAutoplayOnLoad(should: boolean): void {
    this.shouldAutoplayOnLoad = should;
    log.debug('Autoplay on load set to:', should);
  }

  /**
   * Настроить автопереход к следующему эпизоду
   */
  setupAutoAdvance(currentEpisodeIndex: number, totalEpisodes: number): void {
    if (!this.videoElement || !this.config.enabled) {
      return;
    }

    if (this.endedHandler) {
      this.videoElement.removeEventListener('ended', this.endedHandler);
    }

    this.endedHandler = () => {
      log.debug('Video ended, autoplay enabled, checking for next episode');

      const hasNextEpisode = currentEpisodeIndex < totalEpisodes - 1;

      if (hasNextEpisode) {
        log.debug('Auto-advancing to next episode:', currentEpisodeIndex + 1);
        this.config.onEpisodeChange?.(currentEpisodeIndex + 1);
      } else {
        log.debug('No more episodes to auto-advance to');
      }
    };

    this.videoElement.addEventListener('ended', this.endedHandler);
  }

  /**
   * Уничтожить менеджер
   */
  destroy(): void {
    this.detachVideo();
    this.videoElement = null;
  }
}
