import { Player, KodikVideoLinks } from '../../api/animeApi';
import { QualityOption } from './ShakaPlayerManager';
import { offlineStore } from '../offline';
import {
  QUALITY_PREFERENCE_STORAGE_KEY,
  buildOfflineUrl,
} from '../../../constants';
import {
  AutoQualityPolicy,
  AutoQualityReason,
  AutoQualitySample,
  NetworkCeiling,
  pickManualQuality,
} from '../../utils/autoQuality';
import { resolveKodikSource } from '../../utils/kodikHelpers';
import { findOfflineCopies } from '../../utils/playerIdentity';

import { createLogger } from '../../../shared/logger';

const log = createLogger('QualityManager');

/** «Авто» включено и почему оно играет не самое высокое качество. */
export interface QualityModeState {
  auto: boolean;
  available: boolean;
  reason: AutoQualityReason;
}

/** Значение пункта «Авто» в меню качества. */
export const AUTO_QUALITY = 'auto';

export interface QualityManagerConfig {
  onQualityOptionsChange?: (options: QualityOption[]) => void;
  onSelectedQualityChange?: (quality: string) => void;
  onQualityModeChange?: (mode: QualityModeState) => void;
  /** Потолок качества по размеру плеера, по высоте кадра */
  getSizeCap?: (values: string[]) => number;
}

const readPreference = (): string => {
  try {
    return localStorage.getItem(QUALITY_PREFERENCE_STORAGE_KEY) || AUTO_QUALITY;
  } catch {
    return AUTO_QUALITY;
  }
};

const savePreference = (value: string): void => {
  try {
    localStorage.setItem(QUALITY_PREFERENCE_STORAGE_KEY, value);
  } catch (error) {
    log.error('Error saving quality preference:', error);
  }
};

/**
 * Управляет качеством видео и источниками
 */
export class QualityManager {
  private qualityOptions: QualityOption[] = [];

  private selectedQuality: string = '';

  private config: QualityManagerConfig;

  private preference: string = readPreference();

  private policy: AutoQualityPolicy | null = null;

  private ceiling: NetworkCeiling | null = null;

  constructor(config: QualityManagerConfig = {}) {
    this.config = config;
  }

  /**
   * Создает опции качества из данных плеера
   */
  createQualityOptions(
    player: Player,
    kodikLinks?: KodikVideoLinks | null,
    episodeId?: number,
  ): void {
    const options: QualityOption[] = [];
    this.dropPolicy();

    const offlineEpisodes = episodeId
      ? findOfflineCopies(offlineStore.findEpisodes(episodeId), player)
      : [];

    if (offlineEpisodes.length > 0) {
      offlineEpisodes.forEach((episode) => {
        const online = player.video?.quality?.find(
          (item) => `${item.quality}p` === episode.quality,
        );
        const urls = online?.href ? this.buildAnimelibUrls(online.href) : null;

        const isHls = Boolean(episode.playlistFileName);

        options.push({
          label: `${episode.quality} (оффлайн)`,
          value: episode.quality,
          src: buildOfflineUrl(episode.playlistFileName || episode.fileName),
          fallbackSrc: isHls ? undefined : urls?.primaryUrl,
          fallbackSrc2: isHls ? undefined : urls?.fallbackUrl,
          type: isHls ? 'hls' : 'progressive',
        });
      });

      options.sort((a, b) => {
        const qualityA = parseInt(a.value.replace('p', ''), 10);
        const qualityB = parseInt(b.value.replace('p', ''), 10);
        return qualityB - qualityA;
      });

      this.qualityOptions = options;
      this.selectedQuality = options[0].value;
      this.config.onSelectedQualityChange?.(this.selectedQuality);
      this.config.onQualityOptionsChange?.(options);
      this.emitMode();
      log.debug('Using offline sources:', options.length);
      return;
    }

    if (player.player === 'Animelib' && player.video?.quality) {
      player.video.quality.forEach((quality) => {
        if (!quality.href) {
          return;
        }

        const { primaryUrl, fallbackUrl, fallbackUrl2 } =
          this.buildAnimelibUrls(quality.href);

        options.push({
          label: `${quality.quality}p`,
          value: `${quality.quality}p`,
          src: primaryUrl,
          fallbackSrc: fallbackUrl,
          fallbackSrc2: fallbackUrl2,
          type: 'progressive',
        });
      });
    } else if (
      player.player === 'Kodik' &&
      kodikLinks?.success &&
      kodikLinks.data
    ) {
      Object.entries(kodikLinks.data).forEach(([quality, sources]) => {
        if (sources.length > 0) {
          const source = resolveKodikSource(sources[0].src);

          options.push({
            label: `${quality}p`,
            value: `${quality}p`,
            src: source.src,
            fallbackSrc: source.fallbackSrc || undefined,
            type: source.type,
          });
        }
      });
    }

    options.sort((a, b) => {
      const qualityA = parseInt(a.value.replace('p', ''), 10);
      const qualityB = parseInt(b.value.replace('p', ''), 10);
      return qualityB - qualityA;
    });

    this.qualityOptions = options;
    log.debug('Created quality options:', options.length);

    if (options.length > 0) {
      const values = options.map((option) => option.value);
      if (this.isAuto()) {
        this.policy = new AutoQualityPolicy(values, this.ceiling);
        this.selectedQuality = this.policy.initial(
          this.sizeCap(values),
          Date.now(),
        );
      } else {
        this.selectedQuality = pickManualQuality(values, this.preference);
      }
      this.config.onSelectedQualityChange?.(this.selectedQuality);
    }

    this.config.onQualityOptionsChange?.(options);
    this.emitMode();
  }

  /** Выбор пользователя в меню: «Авто» или конкретное качество; запоминается для следующих серий */
  choose(choice: string): string | null {
    const values = this.qualityOptions.map((option) => option.value);
    if (choice !== AUTO_QUALITY && !values.includes(choice)) {
      log.error('Quality not found:', choice);
      return null;
    }

    this.preference = choice;
    savePreference(choice);

    if (choice !== AUTO_QUALITY) {
      this.dropPolicy();
      this.emitMode();
      return choice;
    }

    if (this.isOfflineSource()) {
      this.emitMode();
      return values[0] ?? null;
    }

    this.policy = new AutoQualityPolicy(values, this.ceiling);
    const target = this.policy.initial(this.sizeCap(values), Date.now());
    this.emitMode();
    return target;
  }

  /**
   * Шаг автоподбора: качество, на которое пора переключиться, или null
   */
  autoStep(state: AutoQualitySample): string | null {
    if (!this.policy) return null;

    const now = Date.now();
    const values = this.qualityOptions.map((option) => option.value);
    this.policy.setCap(this.sizeCap(values), now);
    return this.policy.sample(state, now);
  }

  /**
   * Качество сменилось: автоподбор отсчитывает паузу от этого момента
   */
  noteSwitched(value: string): void {
    this.policy?.noteSwitch(value, Date.now());
    this.emitMode();
  }

  /**
   * Перемотка: ожидание буфера после неё не повод понижать качество
   */
  noteSeek(): void {
    this.policy?.noteSeek(Date.now());
  }

  /**
   * Включено ли «Авто»
   */
  isAuto(): boolean {
    return this.preference === AUTO_QUALITY;
  }

  /** Играет ли скачанная копия: выбирать «Авто» не из чего */
  private isOfflineSource(): boolean {
    return this.qualityOptions.some((option) =>
      option.label.endsWith('(оффлайн)'),
    );
  }

  getModeState(): QualityModeState {
    const available = !this.isOfflineSource();
    return {
      auto: available && this.isAuto(),
      available,
      reason: this.policy?.reason(Date.now()) ?? null,
    };
  }

  /**
   * Снимает автоподбор серии, запоминая потолок по сети для следующей
   */
  private dropPolicy(): void {
    if (this.policy) this.ceiling = this.policy.networkCeiling(Date.now());
    this.policy = null;
  }

  private sizeCap(values: string[]): number {
    return this.config.getSizeCap?.(values) ?? Infinity;
  }

  private emitMode(): void {
    this.config.onQualityModeChange?.(this.getModeState());
  }

  /**
   * Создает URL для AnimeLib видео
   */
  // eslint-disable-next-line class-methods-use-this
  public buildAnimelibUrls(href: string): {
    primaryUrl: string;
    fallbackUrl: string;
    fallbackUrl2: string;
  } {
    let primaryUrl: string;
    let fallbackUrl: string;
    let fallbackUrl2: string;

    if (href.startsWith('http')) {
      primaryUrl = href.replace(
        'video1.cdnlibs.org',
        'video1.cdnlibs.org/.%D0%B0s',
      );
      fallbackUrl = href;
      fallbackUrl2 = href.replace('video1.cdnlibs.org', 'video2.cdnlibs.org');
    } else if (href.startsWith('//')) {
      primaryUrl = `https:${href}`;
      fallbackUrl = `https:${href}`;
      fallbackUrl2 = `https:${href}`;
    } else {
      primaryUrl = `https://video1.cdnlibs.org/.%D0%B0s${href}`;
      fallbackUrl = `https://video1.cdnlibs.org${href}`;
      fallbackUrl2 = `https://video2.cdnlibs.org${href}`;
    }

    return { primaryUrl, fallbackUrl, fallbackUrl2 };
  }

  /**
   * Устанавливает выбранное качество
   */
  setSelectedQuality(quality: string): boolean {
    const option = this.qualityOptions.find((q) => q.value === quality);
    if (!option) {
      log.error('Quality not found:', quality);
      return false;
    }

    this.selectedQuality = quality;
    this.config.onSelectedQualityChange?.(quality);
    log.debug('Quality changed to:', quality);
    return true;
  }

  /**
   * Получает текущие опции качества
   */
  getQualityOptions(): QualityOption[] {
    return [...this.qualityOptions];
  }

  /**
   * Получает выбранное качество
   */
  getSelectedQuality(): string {
    return this.selectedQuality;
  }

  /**
   * Получает опцию выбранного качества
   */
  getSelectedQualityOption(): QualityOption | null {
    return (
      this.qualityOptions.find((q) => q.value === this.selectedQuality) || null
    );
  }

  /**
   * Проверяет наличие опций качества
   */
  hasOptions(): boolean {
    return this.qualityOptions.length > 0;
  }

  /**
   * Сбрасывает состояние
   */
  reset(): void {
    this.qualityOptions = [];
    this.selectedQuality = '';
    this.dropPolicy();
    this.config.onQualityOptionsChange?.([]);
    this.config.onSelectedQualityChange?.('');
  }
}
