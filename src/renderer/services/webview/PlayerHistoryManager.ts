import { createLogger } from '../../../shared/logger';

const log = createLogger('PlayerHistory');

/**
 * Запись о переходе в плеер
 */
export interface PlayerHistoryEntry {
  playerUrl: string;
  animeId: string;
  fromUrl: string;
  toUrl: string | null;
}

/**
 * Хранит переходы в плеер, чтобы «Назад» возвращала в него
 */
export class PlayerHistoryManager {
  private entries: PlayerHistoryEntry[] = [];

  private pending: PlayerHistoryEntry | null = null;

  /**
   * Приводит URL к origin + path для сравнения
   */
  private static normalize(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  /**
   * Фиксирует открытие плеера со страницы fromUrl
   */
  open(playerUrl: string, animeId: string, fromUrl: string): void {
    this.pending = { playerUrl, animeId, fromUrl, toUrl: null };
    log.debug('Player opened from:', fromUrl);
  }

  /**
   * Плеер покинут переходом на страницу — запись остаётся в истории
   */
  commit(toUrl: string): void {
    if (!this.pending) {
      return;
    }

    this.entries.push({ ...this.pending, toUrl });
    this.pending = null;
    log.debug('Entry committed, depth:', this.entries.length);
  }

  /**
   * Плеер покинут кнопкой «Назад» — запись не сохраняется
   */
  discard(): void {
    if (this.pending) {
      log.debug('Entry discarded');
    }
    this.pending = null;
  }

  /**
   * Забирает запись плеера, если «Назад» с этой страницы ведёт в него
   */
  takeEntryFor(currentUrl: string): PlayerHistoryEntry | null {
    const last = this.entries[this.entries.length - 1];

    if (!last || !last.toUrl) {
      return null;
    }

    if (
      PlayerHistoryManager.normalize(last.toUrl) !==
      PlayerHistoryManager.normalize(currentUrl)
    ) {
      return null;
    }

    this.entries.pop();
    this.pending = { ...last, toUrl: null };
    log.debug('Restoring player:', last.playerUrl);

    return last;
  }

  /**
   * Очищает историю плееров
   */
  clear(): void {
    this.entries = [];
    this.pending = null;
    log.debug('Cleared');
  }

  /**
   * Глубина сохранённой истории плееров
   */
  getDepth(): number {
    return this.entries.length;
  }
}

export const playerHistoryManager = new PlayerHistoryManager();
