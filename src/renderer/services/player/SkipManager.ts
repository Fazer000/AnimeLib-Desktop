/* eslint-disable no-console */
import { loadFromStorage, saveToStorage } from '../../utils/videoHelpers';

export interface SkipManagerConfig {
  onSkipTimeChange?: (skipTime: number) => void;
}

/**
 * Управляет настройками перемотки видео
 */
export class SkipManager {
  private skipTime: number;

  private config: SkipManagerConfig;

  constructor(config: SkipManagerConfig = {}) {
    this.config = config;
    // Load from storage or use default (85 seconds = 1 min 25 sec)
    this.skipTime = loadFromStorage('videoSkipTime', 85);
  }

  /**
   * Получает текущее время перемотки
   */
  getSkipTime(): number {
    return this.skipTime;
  }

  /**
   * Устанавливает время перемотки
   */
  setSkipTime(time: number): void {
    if (time < 0 || time > 600) {
      // Max 10 minutes
      console.warn('[SkipManager] Invalid skip time:', time);
      return;
    }

    this.skipTime = time;
    saveToStorage('videoSkipTime', time);
    this.config.onSkipTimeChange?.(time);
    console.log('[SkipManager] Skip time changed to:', time);
  }

  /**
   * Получает минуты из времени перемотки
   */
  getMinutes(): number {
    return Math.floor(this.skipTime / 60);
  }

  /**
   * Получает секунды из времени перемотки
   */
  getSeconds(): number {
    return this.skipTime % 60;
  }

  /**
   * Устанавливает минуты (секунды сохраняются)
   */
  setMinutes(minutes: number): void {
    const seconds = this.getSeconds();
    this.setSkipTime(minutes * 60 + seconds);
  }

  /**
   * Устанавливает секунды (минуты сохраняются)
   */
  setSeconds(seconds: number): void {
    const minutes = this.getMinutes();
    this.setSkipTime(minutes * 60 + seconds);
  }

  /**
   * Форматирует время в читаемый вид
   */
  formatSkipTime(): string {
    return `${this.getMinutes()} мин ${this.getSeconds()} сек`;
  }
}
