/* eslint-disable no-console */
import { Player, KodikVideoLinks } from '../../api/animeApi';
import { QualityOption } from './ShakaPlayerManager';
import { offlineStore } from '../offline';
import { buildOfflineUrl } from '../../../constants';
import { resolveKodikSource } from '../../utils/kodikHelpers';

export interface QualityManagerConfig {
  onQualityOptionsChange?: (options: QualityOption[]) => void;
  onSelectedQualityChange?: (quality: string) => void;
}

/**
 * Управляет качеством видео и источниками
 */
export class QualityManager {
  private qualityOptions: QualityOption[] = [];

  private selectedQuality: string = '';

  private config: QualityManagerConfig;

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

    const offlineEpisodes = episodeId
      ? offlineStore.findEpisodes(episodeId, player.id)
      : [];

    if (offlineEpisodes.length > 0) {
      offlineEpisodes.forEach((episode) => {
        const online = player.video?.quality?.find(
          (item) => `${item.quality}p` === episode.quality,
        );
        const urls = online ? this.buildAnimelibUrls(online.href) : null;

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
      console.log('[QualityManager] Using offline sources:', options.length);
      return;
    }

    if (player.player === 'Animelib' && player.video?.quality) {
      player.video.quality.forEach((quality) => {
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
    console.log('[QualityManager] Created quality options:', options.length);

    if (options.length > 0) {
      this.selectedQuality = options[0].value;
      this.config.onSelectedQualityChange?.(this.selectedQuality);
    }

    this.config.onQualityOptionsChange?.(options);
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
      console.error('[QualityManager] Quality not found:', quality);
      return false;
    }

    this.selectedQuality = quality;
    this.config.onSelectedQualityChange?.(quality);
    console.log('[QualityManager] Quality changed to:', quality);
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
    this.config.onQualityOptionsChange?.([]);
    this.config.onSelectedQualityChange?.('');
  }
}
