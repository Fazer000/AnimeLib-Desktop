/* eslint-disable no-console */
import { animeApi } from '../../api/animeApi';
import { WATCH_VIEW_THRESHOLD } from '../../../constants';

/**
 * Отмечает серии просмотренными для статистики профиля
 */
export class WatchStatsManager {
  private animeId: number | null = null;

  private playerId: number | null = null;

  private viewedPlayerIds: Set<number> = new Set();

  private isSending: boolean = false;

  /**
   * Задаёт текущий тайтл и плеер
   */
  setContext(animeId: number | null, playerId: number | null): void {
    this.animeId = animeId;
    this.playerId = playerId;
  }

  /**
   * Проверяет прогресс и при достижении порога отмечает просмотр
   */
  updateProgress(currentTime: number, duration: number): void {
    if (!this.animeId || !this.playerId || duration <= 0) {
      return;
    }

    if (this.viewedPlayerIds.has(this.playerId) || this.isSending) {
      return;
    }

    if (currentTime / duration < WATCH_VIEW_THRESHOLD) {
      return;
    }

    this.markViewed(this.animeId, this.playerId);
  }

  /**
   * Отправляет отметку просмотра
   */
  private markViewed(animeId: number, playerId: number): void {
    this.isSending = true;
    this.viewedPlayerIds.add(playerId);

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
    this.viewedPlayerIds.clear();
    this.isSending = false;
  }
}
