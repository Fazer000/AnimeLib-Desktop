import { animeApi } from '../../api/animeApi';
import { PLAYBACK_MAX_STEP_S, WATCH_VIEW_RETRY_MS } from '../../../constants';
import { viewedStore } from '../offline';
import type { PlayerIdentity } from '../../utils/playerIdentity';
import PlaybackTracker from '../../utils/playbackTracker';
import shouldMarkViewed from '../../utils/watchProgress';

import { createLogger } from '../../../shared/logger';

const log = createLogger('WatchStatsManager');

export interface OfflineWatchContext extends PlayerIdentity {
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

  private episodeId: number | null = null;

  private retryAfter = 0;

  private readonly tracker = new PlaybackTracker(PLAYBACK_MAX_STEP_S);

  /**
   * Задаёт текущий тайтл, плеер и локальный контекст
   */
  setContext(
    animeId: number | null,
    playerId: number | null,
    offline: OfflineWatchContext | null = null,
    episodeId: number | null = null,
  ): void {
    if (episodeId !== this.episodeId) this.tracker.reset();

    this.animeId = animeId;
    this.playerId = playerId;
    this.offline = offline;
    this.episodeId = episodeId;
  }

  /**
   * Проверяет прогресс и при достижении порога отмечает просмотр
   */
  updateProgress(
    currentTime: number,
    duration: number,
    playing: boolean,
  ): void {
    this.tracker.update(currentTime, playing);

    if (!this.playerId || duration <= 0) {
      return;
    }

    if (
      this.viewedPlayerIds.has(this.playerId) ||
      this.isSending ||
      Date.now() < this.retryAfter
    ) {
      return;
    }

    if (
      !shouldMarkViewed(currentTime, duration, this.tracker.playedSinceSeek)
    ) {
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

    viewedStore.mark({ ...context, playerId, synced: false });

    log.debug('Offline view saved:', context.animeId, context.episodeId);
  }

  /**
   * Отправляет отметку просмотра
   */
  private markViewed(animeId: number, playerId: number): void {
    this.isSending = true;
    this.viewedPlayerIds.add(playerId);

    const fail = () => {
      this.viewedPlayerIds.delete(playerId);
      this.retryAfter = Date.now() + WATCH_VIEW_RETRY_MS;
      return null;
    };

    // eslint-disable-next-line promise/catch-or-return
    animeApi
      .markPlayerViewed(animeId, playerId)
      .then((success) => (success ? null : fail()))
      .catch(fail)
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
    this.episodeId = null;
    this.viewedPlayerIds.clear();
    this.isSending = false;
    this.retryAfter = 0;
    this.tracker.reset();
  }
}
