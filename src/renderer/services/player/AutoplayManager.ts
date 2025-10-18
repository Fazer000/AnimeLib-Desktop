/* eslint-disable no-console */

export interface AutoplayConfig {
  enabled: boolean;
  onEpisodeChange?: (episodeIndex: number) => void;
}

export interface LoadContext {
  isVoiceChange: boolean;
  isEpisodeChange: boolean;
  hasBookmark: boolean;
  isFromHint: boolean; // Переключение через хинты (боковые кнопки)
  currentTime?: number; // Сохраненное время для voice change
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
   * Определить нужно ли автовоспроизведение на основе контекста загрузки
   */
  determineAutoplay(context: LoadContext): boolean {
    console.log('[AutoplayManager] Determining autoplay:', context);

    // Первая загрузка - никогда не автовоспроизводим
    if (this.isFirstLoad) {
      this.isFirstLoad = false;
      console.log('[AutoplayManager] First load - no autoplay');
      return false;
    }

    // Закладка - всегда автовоспроизводим
    if (context.hasBookmark) {
      console.log('[AutoplayManager] Bookmark - autoplay enabled');
      return true;
    }

    // Переключение через хинты - ВСЕГДА автовоспроизводим
    if (context.isFromHint) {
      console.log('[AutoplayManager] From hint - autoplay enabled');
      return true;
    }

    // Смена озвучки - сохраняем состояние воспроизведения
    if (context.isVoiceChange) {
      console.log(
        '[AutoplayManager] Voice change - preserving play state:',
        context.currentTime !== undefined,
      );
      return context.currentTime !== undefined;
    }

    // Все остальные случаи - без автовоспроизведения
    console.log('[AutoplayManager] Default - no autoplay');
    return false;
  }

  /**
   * Запустить автопроигрывание при загрузке плеера
   */
  setupAutoplayOnLoad(): void {
    if (!this.videoElement) {
      console.warn('[AutoplayManager] No video element');
      return;
    }

    // Очищаем предыдущий handler
    if (this.canPlayHandler) {
      this.videoElement.removeEventListener('canplay', this.canPlayHandler);
    }

    // Если не нужно автовоспроизведение, выходим
    if (!this.shouldAutoplayOnLoad) {
      console.log('[AutoplayManager] Autoplay not requested for this load');
      return;
    }

    // Создаём новый handler
    this.canPlayHandler = () => {
      if (!this.videoElement) {
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
      }, 100);
    };

    this.videoElement.addEventListener('canplay', this.canPlayHandler);
  }

  /**
   * Установить флаг автовоспроизведения для следующей загрузки
   */
  setShouldAutoplayOnLoad(should: boolean): void {
    this.shouldAutoplayOnLoad = should;
    console.log('[AutoplayManager] Autoplay on load set to:', should);
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
