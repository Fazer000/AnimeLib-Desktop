import { createLogger } from '../../../shared/logger';

const log = createLogger('SegmentManager');

export interface TimeCodeSegment {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

export interface SegmentSettings {
  skipOpenings: boolean;
  skipEndings: boolean;
  skipCompilations: boolean;
  skipSplashScreens: boolean;
}

/**
 * SegmentManager - управление сегментами видео (опенинг, эндинг и т.д.)
 *
 * Отвечает за:
 * - Определение текущего сегмента
 * - Автопропуск сегментов
 * - Сохранение настроек автопропуска
 */
export class SegmentManager {
  private segments: TimeCodeSegment[] = [];

  private currentSegment: TimeCodeSegment | null = null;

  private settings: SegmentSettings;

  private skippedSegments: Set<string> = new Set();

  private videoDuration: number = 0;

  private onSegmentChange?: (segment: TimeCodeSegment | null) => void;

  private onSkipSegment?: (toTime: number) => void;

  constructor(callbacks?: {
    onSegmentChange?: (segment: TimeCodeSegment | null) => void;
    onSkipSegment?: (toTime: number) => void;
  }) {
    this.onSegmentChange = callbacks?.onSegmentChange;
    this.onSkipSegment = callbacks?.onSkipSegment;

    this.settings = SegmentManager.loadSettings();
  }

  /**
   * Загрузить настройки из localStorage
   */
  private static loadSettings(): SegmentSettings {
    const stored = localStorage.getItem('autoSkipSettings');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // fallthrough
      }
    }

    return {
      skipOpenings: false,
      skipEndings: false,
      skipCompilations: false,
      skipSplashScreens: false,
    };
  }

  /**
   * Сохранить настройки в localStorage
   */
  private saveSettings(): void {
    localStorage.setItem('autoSkipSettings', JSON.stringify(this.settings));
  }

  /**
   * Установить сегменты
   */
  setSegments(segments: TimeCodeSegment[]): void {
    this.segments = segments;
    this.skippedSegments.clear();
    log.debug('Segments set:', segments.length);
  }

  /**
   * Установить длительность видео
   */
  setDuration(duration: number): void {
    if (this.videoDuration !== duration && duration > 0) {
      this.skippedSegments.clear();
      log.debug('Duration changed, cleared skip history');
    }
    this.videoDuration = duration;
  }

  /**
   * Обновить текущее время и проверить сегменты
   */
  updateCurrentTime(currentTime: number): void {
    if (this.segments.length === 0) {
      if (this.currentSegment !== null) {
        this.currentSegment = null;
        this.onSegmentChange?.(null);
      }
      return;
    }

    const activeSegment =
      this.segments.find(
        (segment) => currentTime >= segment.from && currentTime <= segment.to,
      ) ?? null;

    if (activeSegment !== this.currentSegment) {
      this.currentSegment = activeSegment;
      this.onSegmentChange?.(this.currentSegment);

      if (this.currentSegment && this.shouldAutoSkip(this.currentSegment)) {
        const segmentKey = `${this.currentSegment.from}-${this.currentSegment.to}-${this.currentSegment.type}`;

        if (!this.skippedSegments.has(segmentKey)) {
          log.debug(`Auto-skipping ${this.currentSegment.type} segment`);
          this.skippedSegments.add(segmentKey);
          this.skipCurrentSegment();
        }
      }
    }
  }

  /**
   * Получить текущий сегмент
   */
  getCurrentSegment(): TimeCodeSegment | null {
    return this.currentSegment;
  }

  /**
   * Получить настройки
   */
  getSettings(): SegmentSettings {
    return { ...this.settings };
  }

  /**
   * Обновить настройки
   */
  updateSettings(settings: Partial<SegmentSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
    log.debug('Settings updated:', this.settings);
  }

  /**
   * Проверить нужно ли автопропустить сегмент
   */
  private shouldAutoSkip(segment: TimeCodeSegment): boolean {
    switch (segment.type) {
      case 'opening':
        return this.settings.skipOpenings;
      case 'ending':
        return this.settings.skipEndings;
      case 'compilation':
        return this.settings.skipCompilations;
      case 'splashScreen':
        return this.settings.skipSplashScreens;
      default:
        return false;
    }
  }

  /**
   * Пропустить текущий сегмент
   */
  skipCurrentSegment(): void {
    if (!this.currentSegment) {
      log.warn('No current segment to skip');
      return;
    }

    let skipToTime = this.currentSegment.to + 1;

    if (this.videoDuration > 0 && skipToTime >= this.videoDuration) {
      skipToTime = this.videoDuration - 0.5;
      log.debug(`Segment goes to end, skipping to ${skipToTime} (near end)`);
    } else {
      log.debug('Skipping to:', skipToTime);
    }

    this.onSkipSegment?.(skipToTime);
  }

  /**
   * Уничтожить менеджер
   */
  destroy(): void {
    this.segments = [];
    this.currentSegment = null;
    this.skippedSegments.clear();
    this.videoDuration = 0;
    this.onSegmentChange = undefined;
    this.onSkipSegment = undefined;
  }
}
