/**
 * Оценка объёма будущих загрузок по уже скачанным сериям
 */
import {
  OFFLINE_ESTIMATED_EPISODE_BYTES,
  OFFLINE_ESTIMATED_EPISODE_FALLBACK_BYTES,
} from '../../../constants';
import { offlineStore } from './OfflineStore';

class SizeEstimator {
  /**
   * Возвращает средний размер скачанной серии в качестве
   */
  // eslint-disable-next-line class-methods-use-this
  private getAverage(quality: string): number {
    const sizes = offlineStore
      .getSnapshot()
      .anime.flatMap((item) => item.episodes)
      .filter((episode) => episode.quality === quality && episode.fileSize > 0)
      .map((episode) => episode.fileSize);

    if (sizes.length === 0) {
      return 0;
    }

    return sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
  }

  /**
   * Оценивает размер одной серии в качестве
   */
  public estimateEpisode(quality: string): number {
    return (
      this.getAverage(quality) ||
      OFFLINE_ESTIMATED_EPISODE_BYTES[quality] ||
      OFFLINE_ESTIMATED_EPISODE_FALLBACK_BYTES
    );
  }

  /**
   * Оценивает суммарный размер списка качеств
   */
  public estimateTotal(qualities: string[]): number {
    return qualities.reduce(
      (sum, quality) => sum + this.estimateEpisode(quality),
      0,
    );
  }
}

// eslint-disable-next-line import/prefer-default-export
export const sizeEstimator = new SizeEstimator();
