/* eslint-disable no-console */

export interface KeyboardManagerConfig {
  onPlayPause?: () => void;
  onSeek?: (seconds: number) => void;
  onSeekToPercent?: (percent: number) => void;
  onVolumeChange?: (delta: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onTogglePictureInPicture?: () => void;
  onPlaybackRateChange?: (delta: number) => void;
}

/**
 * Управляет горячими клавишами для видеоплеера
 */
export class KeyboardManager {
  private config: KeyboardManagerConfig;

  private isEnabled: boolean = true;

  private boundHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(config: KeyboardManagerConfig = {}) {
    this.config = config;
  }

  /**
   * Включает обработку горячих клавиш
   */
  enable(): void {
    if (this.boundHandler) {
      return; // Already enabled
    }

    this.boundHandler = (event: KeyboardEvent) => this.handleKeyDown(event);
    document.addEventListener('keydown', this.boundHandler);
    this.isEnabled = true;
    console.log('[KeyboardManager] Enabled');
  }

  /**
   * Отключает обработку горячих клавиш
   */
  disable(): void {
    if (this.boundHandler) {
      document.removeEventListener('keydown', this.boundHandler);
      this.boundHandler = null;
    }
    this.isEnabled = false;
    console.log('[KeyboardManager] Disabled');
  }

  /**
   * Обрабатывает нажатие клавиши
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Ignore if focus is on input/textarea/select
    const { activeElement } = document;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        (activeElement as HTMLElement).contentEditable === 'true')
    ) {
      return;
    }

    const { key } = event;
    let handled = false;

    switch (key) {
      // Play/Pause
      case ' ':
      case 'k':
      case 'K':
      case 'л': // Russian layout
        this.config.onPlayPause?.();
        handled = true;
        break;

      // Seek backward
      case 'ArrowLeft':
      case 'j':
      case 'J':
        this.config.onSeek?.(-10);
        handled = true;
        break;

      // Seek forward
      case 'ArrowRight':
      case 'l':
      case 'L':
      case 'д': // Russian layout
        this.config.onSeek?.(10);
        handled = true;
        break;

      // Volume up
      case 'ArrowUp':
        this.config.onVolumeChange?.(0.1);
        handled = true;
        break;

      // Volume down
      case 'ArrowDown':
        this.config.onVolumeChange?.(-0.1);
        handled = true;
        break;

      // Toggle mute
      case 'm':
      case 'M':
      case 'ь': // Russian layout
        this.config.onToggleMute?.();
        handled = true;
        break;

      // Toggle fullscreen
      case 'f':
      case 'F':
      case 'а': // Russian layout
        this.config.onToggleFullscreen?.();
        handled = true;
        break;

      // Toggle Picture-in-Picture
      case 'i':
      case 'I':
      case 'ш': // Russian layout
        this.config.onTogglePictureInPicture?.();
        handled = true;
        break;

      // Seek to percentage (0-9)
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        const percent = parseInt(key, 10) * 10;
        this.config.onSeekToPercent?.(percent);
        handled = true;
        break;
      }

      // Decrease playback rate
      case '<':
      case ',':
        this.config.onPlaybackRateChange?.(-0.25);
        handled = true;
        break;

      // Increase playback rate
      case '>':
      case '.':
        this.config.onPlaybackRateChange?.(0.25);
        handled = true;
        break;

      default:
        // Not handled
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Обновляет конфигурацию
   */
  updateConfig(config: Partial<KeyboardManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Проверяет, включен ли менеджер
   */
  isActive(): boolean {
    return this.isEnabled;
  }
}
