/* eslint-disable no-console */
import { animeApi } from '../../api/animeApi';
import { WATCH_VIEW_THRESHOLD } from '../../../constants';
import { viewedStore } from '../offline';

export interface OfflineWatchContext {
  animeId: string;
  episodeId: number;
}

/**
 * Отмечает серии просмотренными для статистики профиля
 */
// eslint-disable-next-line import/prefer-default-export
export class WatchStatsManager {
  private animeId: number | null = null;

  private playerId: number | null = null;

  private offline: OfflineWatchContext | null = null;

  private viewedPlayerIds: Set<number> = new Set();

  private isSending: boolean = false;

  /**
   * Задаёт текущий тайтл, плеер и локальный контекст
   */
  setContext(
    animeId: number | null,
    playerId: number | null,
    offline: OfflineWatchContext | null = null,
  ): void {
    this.animeId = animeId;
    this.playerId = playerId;
    this.offline = offline;
  }

  /**
   * Проверяет прогресс и при достижении порога отмечает просмотр
   */
  updateProgress(currentTime: number, duration: number): void {
    if (!this.playerId || duration <= 0) {
      return;
    }

    if (this.viewedPlayerIds.has(this.playerId) || this.isSending) {
      return;
    }

    if (currentTime / duration < WATCH_VIEW_THRESHOLD) {
      return;
    }

    if (this.offline) {
      this.markViewedOffline(this.offline, this.playerId);
      return;
    }

    if (this.animeId) {
      this.markViewed(this.animeId, this.playerId);
    }
  }

  /**
   * Сохраняет отметку локально для последующей синхронизации
   */
  private markViewedOffline(
    context: OfflineWatchContext,
    playerId: number,
  ): void {
    this.viewedPlayerIds.add(playerId);

    viewedStore.mark({
      animeId: context.animeId,
      episodeId: context.episodeId,
      playerId,
      synced: false,
    });

    console.log(
      '[WatchStatsManager] Offline view saved:',
      context.animeId,
      context.episodeId,
    );
  }

  /**
   * Отправляет отметку просмотра
   */
  private markViewed(animeId: number, playerId: number): void {
    this.isSending = true;
    this.viewedPlayerIds.add(playerId);

    // eslint-disable-next-line promise/catch-or-return
    animeApi
      .markPlayerViewed(animeId, playerId)
      .then((success) => {
        if (!success) {
          this.viewedPlayerIds.delete(playerId);
        }
        return null;
      })
      .catch(() => {
        this.viewedPlayerIds.delete(playerId);
        return null;
      })
      .finally(() => {
        this.isSending = false;
      });
  }

  /**
   * Сбрасывает состояние
   */
  reset(): void {
    this.animeId = null;
    this.playerId = null;
    this.offline = null;
    this.viewedPlayerIds.clear();
    this.isSending = false;
  }
}
