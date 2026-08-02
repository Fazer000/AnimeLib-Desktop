/* eslint-disable no-console */

import { PLAYER_EPISODES_VISIBLE_BY_DEFAULT } from '../../../constants';

export interface UIState {
  showControls: boolean;
  isFullscreen: boolean;
  showCenterIcon: boolean;
  hoverTime: number | null;
  isMenuOpen: boolean;
  showEpisodesList: boolean;
}

/**
 * UIStateManager - управление состоянием UI плеера
 *
 * Отвечает за:
 * - Видимость контролов
 * - Fullscreen режим
 * - Центральная иконка плей/пауза
 * - Hover время на прогресс-баре
 * - Состояние меню
 */
export class UIStateManager {
  private showControls: boolean = true;

  private isFullscreen: boolean = false;

  private showCenterIcon: boolean = false;

  private hoverTime: number | null = null;

  private isMenuOpen: boolean = false;

  private showEpisodesList: boolean = PLAYER_EPISODES_VISIBLE_BY_DEFAULT;

  private onStateChange?: (state: UIState) => void;

  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  private clickTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks?: { onStateChange?: (state: UIState) => void }) {
    this.onStateChange = callbacks?.onStateChange;
  }

  /**
   * Получить текущее состояние
   */
  getState(): UIState {
    return {
      showControls: this.showControls,
      isFullscreen: this.isFullscreen,
      showCenterIcon: this.showCenterIcon,
      hoverTime: this.hoverTime,
      isMenuOpen: this.isMenuOpen,
      showEpisodesList: this.showEpisodesList,
    };
  }

  /**
   * Обновить состояние и уведомить подписчиков
   */
  private updateState(updates: Partial<UIState>): void {
    const keys = Object.keys(updates) as (keyof UIState)[];
    const hasChanges = keys.some(
      (key) => (this as any)[key] !== (updates as any)[key],
    );

    if (!hasChanges) return;

    Object.assign(this, updates);
    this.onStateChange?.(this.getState());
  }

  /**
   * Показать контролы
   */
  showPlayerControls(): void {
    this.updateState({ showControls: true });
  }

  /**
   * Скрыть контролы
   */
  hidePlayerControls(): void {
    this.updateState({ showControls: false });
  }

  /**
   * Установить fullscreen состояние
   */
  setFullscreen(isFullscreen: boolean): void {
    this.updateState({ isFullscreen });
  }

  /**
   * Показать центральную иконку плей/пауза
   */
  showPlayPauseIcon(): void {
    this.updateState({ showCenterIcon: true });

    setTimeout(() => {
      this.updateState({ showCenterIcon: false });
    }, 1000);
  }

  /**
   * Установить hover время на прогресс-баре
   */
  setHoverTime(time: number | null): void {
    this.updateState({ hoverTime: time });
  }

  /**
   * Установить состояние меню
   */
  setMenuOpen(isOpen: boolean): void {
    this.updateState({ isMenuOpen: isOpen });
  }

  /**
   * Переключить список эпизодов
   */
  toggleEpisodesList(): void {
    this.updateState({ showEpisodesList: !this.showEpisodesList });
  }

  /**
   * Установить видимость списка эпизодов
   */
  setShowEpisodesList(show: boolean): void {
    this.updateState({ showEpisodesList: show });
  }

  /**
   * Запустить автоскрытие контролов
   */
  startAutoHide(isPlaying: boolean, delay: number = 2000): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }

    if (!isPlaying || this.isMenuOpen || this.hoverTime !== null) {
      return;
    }

    if (!this.showControls) {
      return;
    }

    this.autoHideTimer = setTimeout(() => {
      console.log('[UIStateManager] Auto-hiding controls');
      this.hidePlayerControls();
    }, delay);
  }

  /**
   * Остановить автоскрытие контролов
   */
  stopAutoHide(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  /**
   * Получить таймер клика (для debounce)
   */
  getClickTimeout(): ReturnType<typeof setTimeout> | null {
    return this.clickTimeout;
  }

  /**
   * Установить таймер клика
   */
  setClickTimeout(timeout: ReturnType<typeof setTimeout> | null): void {
    this.clickTimeout = timeout;
  }

  /**
   * Очистить таймер клика
   */
  clearClickTimeout(): void {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
  }

  /**
   * Уничтожить менеджер
   */
  destroy(): void {
    this.stopAutoHide();
    this.clearClickTimeout();
    this.onStateChange = undefined;
  }
}
