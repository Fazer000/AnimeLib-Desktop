import workerUrl from 'jassub/dist/jassub-worker.js';
import wasmUrl from 'jassub/dist/jassub-worker.wasm';
import modernWasmUrl from 'jassub/dist/jassub-worker-modern.wasm';
import fallbackFontUrl from 'jassub/dist/default.woff2';
import { Player } from '../../api/animeApi';
import {
  SubtitleCue,
  SubtitleFormat,
  SubtitleStyleSettings,
  applyAssStyleOverrides,
  buildSubtitleTrackLabel,
  buildSubtitleUrlCandidates,
  detectSubtitleFormat,
  parseTimedText,
} from '../../utils/subtitleHelpers';
import {
  SUBTITLES_DEFAULT_SETTINGS,
  SUBTITLES_STORAGE_KEY,
} from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('SubtitlesManager');

export interface SubtitleTrack {
  id: number;
  name: string;
  format: SubtitleFormat;
  src: string;
}

export interface SubtitlesSettings extends SubtitleStyleSettings {
  trackName: string | null;
}

export interface SubtitlesManagerConfig {
  onTracksChange?: (tracks: SubtitleTrack[]) => void;
  onCuesChange?: (cues: SubtitleCue[]) => void;
  onSettingsChange?: (settings: SubtitlesSettings) => void;
  onError?: (error: string) => void;
}

/**
 * Приводит URL ассета к абсолютному виду для воркера JASSUB
 */
const toAbsoluteUrl = (url: string): string =>
  new URL(url, window.location.href).href;

/**
 * Управляет дорожками субтитров: выбор, загрузка, рендеринг и стили
 */
export class SubtitlesManager {
  private config: SubtitlesManagerConfig;

  private videoElement: HTMLVideoElement | null = null;

  private tracks: SubtitleTrack[] = [];

  private settings: SubtitlesSettings;

  private rawContent: string | null = null;

  private activeFormat: SubtitleFormat | null = null;

  private renderer: any = null;

  private loadToken: number = 0;

  constructor(config: SubtitlesManagerConfig = {}) {
    this.config = config;
    this.settings = SubtitlesManager.loadSettings();
  }

  /**
   * Читает сохранённые настройки субтитров
   */
  private static loadSettings(): SubtitlesSettings {
    try {
      const raw = localStorage.getItem(SUBTITLES_STORAGE_KEY);
      if (raw) {
        return { ...SUBTITLES_DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (error) {
      log.error('Failed to read settings:', error);
    }

    return { ...SUBTITLES_DEFAULT_SETTINGS };
  }

  /**
   * Сохраняет настройки субтитров
   */
  private persistSettings(): void {
    try {
      localStorage.setItem(
        SUBTITLES_STORAGE_KEY,
        JSON.stringify(this.settings),
      );
    } catch (error) {
      log.error('Failed to save settings:', error);
    }

    this.config.onSettingsChange?.({ ...this.settings });
  }

  /**
   * Запрашивает файл субтитров через main-процесс
   */
  private static async fetchContent(src: string): Promise<string | null> {
    const api = window.electron?.electronAPI;

    if (!api?.fetchSubtitles) {
      log.error('fetchSubtitles IPC not available');
      return null;
    }

    const result = await api.fetchSubtitles(buildSubtitleUrlCandidates(src));
    return result?.success ? (result.data ?? null) : null;
  }

  /**
   * Привязывает менеджер к видеоэлементу
   */
  attach(videoElement: HTMLVideoElement): void {
    this.videoElement = videoElement;
  }

  /**
   * Формирует список дорожек из данных плеера
   */
  setTracks(player: Player): void {
    const usedNames = new Map<string, number>();

    this.tracks = (player.subtitles || []).map((item, index) => {
      const label = buildSubtitleTrackLabel(item, index);
      const seen = usedNames.get(label) || 0;
      usedNames.set(label, seen + 1);

      return {
        id: item.id,
        name: seen === 0 ? label : `${label} (${seen + 1})`,
        format: detectSubtitleFormat(item.format, item.filename),
        src: item.src,
      };
    });

    log.debug('Tracks available:', this.tracks.length);
    this.config.onTracksChange?.([...this.tracks]);

    const preferred = this.tracks.find(
      (track) => track.name === this.settings.trackName,
    );

    if (!preferred && this.tracks.length > 0 && this.settings.trackName) {
      this.settings.trackName = null;
      this.persistSettings();
    }

    this.applyTrack(preferred || null);
  }

  /**
   * Выбирает дорожку по имени, null отключает субтитры
   */
  selectTrack(trackName: string | null): void {
    this.settings.trackName = trackName;
    this.persistSettings();

    this.applyTrack(
      this.tracks.find((track) => track.name === trackName) || null,
    );
  }

  /**
   * Обновляет стили субтитров
   */
  updateSettings(patch: Partial<SubtitleStyleSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.persistSettings();
    this.render();
  }

  /**
   * Загружает содержимое дорожки и запускает отрисовку
   */
  private async applyTrack(track: SubtitleTrack | null): Promise<void> {
    this.loadToken += 1;
    const token = this.loadToken;

    this.clearRendered();

    if (!track) return;

    const content = await SubtitlesManager.fetchContent(track.src);
    if (token !== this.loadToken) return;

    if (!content) {
      this.config.onError?.('Не удалось загрузить субтитры');
      return;
    }

    this.rawContent = content;
    this.activeFormat = track.format;
    this.render();
  }

  /**
   * Отрисовывает активную дорожку с учётом настроек
   */
  private async render(): Promise<void> {
    if (!this.rawContent || !this.activeFormat) return;

    if (this.activeFormat !== 'ass') {
      this.config.onCuesChange?.(parseTimedText(this.rawContent));
      return;
    }

    const content = applyAssStyleOverrides(this.rawContent, this.settings);

    if (this.renderer) {
      this.renderer.setTrack(content);
      return;
    }

    if (!this.videoElement) return;

    try {
      const { default: JASSUB } = await import('jassub');

      this.renderer = new JASSUB({
        video: this.videoElement,
        subContent: content,
        workerUrl: toAbsoluteUrl(workerUrl),
        wasmUrl: toAbsoluteUrl(wasmUrl),
        modernWasmUrl: toAbsoluteUrl(modernWasmUrl),
        availableFonts: { 'liberation sans': toAbsoluteUrl(fallbackFontUrl) },
        fallbackFont: 'liberation sans',
        useLocalFonts: false,
      });

      log.debug('JASSUB renderer created');
    } catch (error) {
      log.error('JASSUB init failed:', error);
      this.config.onError?.('Не удалось запустить рендер ASS-субтитров');
    }
  }

  /**
   * Убирает отображаемые субтитры, список дорожек не трогает
   */
  private clearRendered(): void {
    this.rawContent = null;
    this.activeFormat = null;
    this.config.onCuesChange?.([]);

    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }

  /**
   * Возвращает доступные дорожки
   */
  getTracks(): SubtitleTrack[] {
    return [...this.tracks];
  }

  /**
   * Возвращает текущие настройки субтитров
   */
  getSettings(): SubtitlesSettings {
    return { ...this.settings };
  }

  /**
   * Сбрасывает состояние при смене плеера
   */
  reset(): void {
    this.loadToken += 1;
    this.tracks = [];
    this.clearRendered();
    this.config.onTracksChange?.([]);
  }

  /**
   * Уничтожает менеджер
   */
  destroy(): void {
    this.reset();
    this.videoElement = null;
  }
}
