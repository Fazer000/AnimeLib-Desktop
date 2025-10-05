/* eslint-disable no-console */

export interface UIState {
  showControls: boolean;
  isFullscreen: boolean;
  isMenuOpen: boolean;
  showEpisodes: boolean;
  showVolumeTooltip: boolean;
  hoverTime: number | null;
  showCenterIcon: boolean;
}

export interface UIStateConfig {
  onStateChange?: (state: Partial<UIState>) => void;
}

/**
 * Управляет состоянием UI плеера
 */
export class UIStateManager {
  private state: UIState;

  private config: UIStateConfig;

  private autoHideTimeout: ReturnType<typeof setTimeout> | null = null;

  private volumeTooltipTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: UIStateConfig = {}) {
    this.config = config;
    this.state = {
      showControls: true,
      isFullscreen: false,
      isMenuOpen: false,
      showEpisodes: false,
      showVolumeTooltip: false,
      hoverTime: null,
      showCenterIcon: false,
    };
  }

  /**
   * Обновляет состояние
   */
  private updateState(updates: Partial<UIState>): void {
    this.state = { ...this.state, ...updates };
    this.config.onStateChange?.(updates);
  }

  /**
   * Показывает контролы
   */
  showControls(): void {
    this.updateState({ showControls: true });
    this.resetAutoHideTimeout();
  }

  /**
   * Скрывает контролы
   */
  hideControls(): void {
    if (!this.state.isMenuOpen) {
      this.updateState({ showControls: false });
    }
  }

  /**
   * Устанавливает таймер автоскрытия контролов
   */
  private resetAutoHideTimeout(): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }

    // Auto-hide only if playing and menu is not open
    if (!this.state.isMenuOpen) {
      this.autoHideTimeout = setTimeout(() => {
        this.hideControls();
      }, 4000);
    }
  }

  /**
   * Переключает полноэкранный режим
   */
  setFullscreen(isFullscreen: boolean): void {
    this.updateState({ isFullscreen });
  }

  /**
   * Открывает/закрывает меню
   */
  setMenuOpen(isOpen: boolean): void {
    this.updateState({ isMenuOpen: isOpen });

    if (isOpen) {
      // Keep controls visible when menu is open
      if (this.autoHideTimeout) {
        clearTimeout(this.autoHideTimeout);
        this.autoHideTimeout = null;
      }
    } else {
      this.resetAutoHideTimeout();
    }
  }

  /**
   * Показывает/скрывает список эпизодов
   */
  setShowEpisodes(show: boolean): void {
    this.updateState({ showEpisodes: show });
    this.setMenuOpen(show);
  }

  /**
   * Показывает тултип громкости
   */
  showVolumeTooltip(): void {
    this.updateState({ showVolumeTooltip: true });

    if (this.volumeTooltipTimeout) {
      clearTimeout(this.volumeTooltipTimeout);
    }

    this.volumeTooltipTimeout = setTimeout(() => {
      this.updateState({ showVolumeTooltip: false });
    }, 1500);
  }

  /**
   * Устанавливает время при наведении на прогресс бар
   */
  setHoverTime(time: number | null): void {
    this.updateState({ hoverTime: time });
  }

  /**
   * Показывает центральную иконку play/pause
   */
  showCenterIcon(): void {
    this.updateState({ showCenterIcon: true });
    setTimeout(() => {
      this.updateState({ showCenterIcon: false });
    }, 1000);
  }

  /**
   * Получает текущее состояние
   */
  getState(): UIState {
    return { ...this.state };
  }

  /**
   * Очищает все таймеры
   */
  cleanup(): void {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
    if (this.volumeTooltipTimeout) {
      clearTimeout(this.volumeTooltipTimeout);
      this.volumeTooltipTimeout = null;
    }
  }
}
