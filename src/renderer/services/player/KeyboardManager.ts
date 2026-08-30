import { createLogger } from '../../../shared/logger';

const log = createLogger('KeyboardManager');

export interface KeyboardManagerConfig {
  onPlayPause?: () => void;
  onSeek?: (seconds: number) => void;
  onSeekToPercent?: (percent: number) => void;
  onVolumeChange?: (delta: number) => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onTogglePictureInPicture?: () => void;
  onPlaybackRateChange?: (delta: number) => void;
  onSkipForward?: (seconds: number) => void;
  skipTime?: number;
  onKeyPress?: () => void;
  onToggleEpisodes?: () => void;
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
      return;
    }

    this.boundHandler = (event: KeyboardEvent) => this.handleKeyDown(event);
    document.addEventListener('keydown', this.boundHandler);
    this.isEnabled = true;
    log.debug('Enabled');
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
    log.debug('Disabled');
  }

  /**
   * Обрабатывает нажатие клавиши
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

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
    const code = key.length === 1 ? key.toLowerCase() : key;
    let handled = false;

    switch (code) {
      case ' ':
      case 'k':
      case 'л':
        this.config.onPlayPause?.();
        handled = true;
        break;

      case 'ArrowLeft':
      case 'j':
      case 'о':
        this.config.onSeek?.(-10);
        handled = true;
        break;

      case 'ArrowRight':
        if (event.shiftKey && this.config.onSkipForward) {
          this.config.onSkipForward(this.config.skipTime || 85);
        } else {
          this.config.onSeek?.(10);
        }
        handled = true;
        break;

      case 'l':
      case 'д':
        this.config.onSeek?.(10);
        handled = true;
        break;

      case 'ArrowUp':
        this.config.onVolumeChange?.(0.1);
        handled = true;
        break;

      case 'ArrowDown':
        this.config.onVolumeChange?.(-0.1);
        handled = true;
        break;

      case 'm':
      case 'ь':
        this.config.onToggleMute?.();
        handled = true;
        break;

      case 'f':
      case 'а':
        this.config.onToggleFullscreen?.();
        handled = true;
        break;

      case 'i':
      case 'ш':
        this.config.onTogglePictureInPicture?.();
        handled = true;
        break;

      case 'v':
      case 'м':
        this.config.onToggleEpisodes?.();
        handled = true;
        break;

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        this.config.onSeekToPercent?.(parseInt(code, 10) * 10);
        handled = true;
        break;

      case ',':
      case '<':
      case 'б':
        this.config.onPlaybackRateChange?.(-0.25);
        handled = true;
        break;

      case '.':
      case '>':
      case 'ю':
        this.config.onPlaybackRateChange?.(0.25);
        handled = true;
        break;

      default:
        break;
    }

    if (handled) {
      event.preventDefault();
      this.config.onKeyPress?.();
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
