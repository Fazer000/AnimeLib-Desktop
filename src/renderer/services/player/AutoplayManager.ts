/* eslint-disable no-console */

export interface AutoplayConfig {
  enabled: boolean;
  onEpisodeChange?: (episodeIndex: number) => void;
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

  // Event handlers
  private canPlayHandler: (() => void) | null = null;

  private endedHandler: (() => void) | null = null;

  constructor(config: AutoplayConfig) {
    this.config = config;
  }

  /**
   * Прикрепить видео элемент
   */
  attachVideo(video: HTMLVideoElement): void {
    this.detachVideo(); // Очищаем предыдущий
    this.videoElement = video;
    console.log('[AutoplayManager] Video element attached');
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
    // Не автопроигрываем на первой загрузке
    if (this.isFirstLoad) {
      console.log('[AutoplayManager] First load - skipping autoplay');
      return false;
    }

    // Не автопроигрываем если ждём закладку
    if (this.hasBookmarkPending) {
      console.log('[AutoplayManager] Bookmark pending - skipping autoplay');
      return false;
    }

    return true;
  }

  /**
   * Запустить автопроигрывание при загрузке плеера
   */
  setupAutoplayOnLoad(): void {
    if (!this.videoElement) {
      console.warn('[AutoplayManager] No video element');
      return;
    }

    // Пропускаем первую загрузку
    if (this.isFirstLoad) {
      this.isFirstLoad = false;
      console.log('[AutoplayManager] First load - skipping autoplay setup');
      return;
    }

    // Очищаем предыдущий handler
    if (this.canPlayHandler) {
      this.videoElement.removeEventListener('canplay', this.canPlayHandler);
    }

    // Создаём новый handler
    this.canPlayHandler = () => {
      if (!this.shouldAutoplay() || !this.videoElement) {
        return;
      }

      console.log('[AutoplayManager] Video ready - starting autoplay');

      // Небольшая задержка для уверенности что видео готово
      setTimeout(() => {
        if (!this.videoElement || !this.videoElement.paused) {
          console.log('[AutoplayManager] Video already playing');
          return;
        }

        this.videoElement
          .play()
          .then(() => {
            console.log('[AutoplayManager] Autoplay started successfully');
            return undefined;
          })
          .catch((error) => {
            console.warn('[AutoplayManager] Autoplay failed:', error);
          });
      }, 300);
    };

    this.videoElement.addEventListener('canplay', this.canPlayHandler);
  }

  /**
   * Настроить автопереход к следующему эпизоду
   */
  setupAutoAdvance(currentEpisodeIndex: number, totalEpisodes: number): void {
    if (!this.videoElement || !this.config.enabled) {
      return;
    }

    // Очищаем предыдущий handler
    if (this.endedHandler) {
      this.videoElement.removeEventListener('ended', this.endedHandler);
    }

    // Создаём новый handler
    this.endedHandler = () => {
      console.log(
        '[AutoplayManager] Video ended, autoplay enabled, checking for next episode',
      );

      const hasNextEpisode = currentEpisodeIndex < totalEpisodes - 1;

      if (hasNextEpisode) {
        console.log(
          '[AutoplayManager] Auto-advancing to next episode:',
          currentEpisodeIndex + 1,
        );
        this.config.onEpisodeChange?.(currentEpisodeIndex + 1);
      } else {
        console.log('[AutoplayManager] No more episodes to auto-advance to');
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
