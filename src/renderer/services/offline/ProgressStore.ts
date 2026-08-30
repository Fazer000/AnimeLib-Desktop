/**
 * Локальный прогресс просмотра с отложенной синхронизацией
 */
import {
  OFFLINE_PROGRESS_STORAGE_KEY,
  OfflineProgress,
} from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('ProgressStore');

type ProgressMap = Record<string, OfflineProgress>;

/**
 * Строит ключ записи прогресса
 */
const buildKey = (animeId: string, episodeId: number): string =>
  `${animeId}:${episodeId}`;

class ProgressStore {
  /**
   * Читает все записи
   */
  // eslint-disable-next-line class-methods-use-this
  public getAll(): ProgressMap {
    try {
      const raw = localStorage.getItem(OFFLINE_PROGRESS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Записывает все записи
   */
  // eslint-disable-next-line class-methods-use-this
  private setAll(map: ProgressMap): void {
    try {
      localStorage.setItem(OFFLINE_PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch (error) {
      log.error('Save failed:', error);
    }
  }

  /**
   * Сохраняет позицию просмотра
   */
  public save(entry: Omit<OfflineProgress, 'updatedAt'>): void {
    this.saveAt(entry, new Date().toISOString());
  }

  /**
   * Сохраняет позицию с явной отметкой времени
   */
  public saveAt(
    entry: Omit<OfflineProgress, 'updatedAt'>,
    updatedAt: string,
  ): void {
    const map = this.getAll();

    map[buildKey(entry.animeId, entry.episodeId)] = {
      ...entry,
      updatedAt: ProgressStore.normalizeTimestamp(updatedAt),
    };

    this.setAll(map);
  }

  /**
   * Приводит отметку времени к ISO для корректной сортировки
   */
  private static normalizeTimestamp(value: string): string {
    const parsed = new Date(value.replace(' ', 'T'));

    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString()
      : parsed.toISOString();
  }

  /**
   * Возвращает позицию конкретной серии
   */
  public get(animeId: string, episodeId: number): OfflineProgress | null {
    return this.getAll()[buildKey(animeId, episodeId)] || null;
  }

  /**
   * Возвращает последнюю просмотренную серию аниме
   */
  public getLatestForAnime(animeId: string): OfflineProgress | null {
    const items = Object.values(this.getAll()).filter(
      (item) => item.animeId === animeId,
    );

    if (items.length === 0) {
      return null;
    }

    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  /**
   * Возвращает записи, ещё не отправленные на сайт
   */
  public getPending(): OfflineProgress[] {
    return Object.values(this.getAll()).filter((item) => !item.synced);
  }

  /**
   * Помечает запись синхронизированной
   */
  public markSynced(animeId: string, episodeId: number): void {
    const map = this.getAll();
    const key = buildKey(animeId, episodeId);

    if (map[key]) {
      map[key].synced = true;
      this.setAll(map);
    }
  }
}

// eslint-disable-next-line import/prefer-default-export
export const progressStore = new ProgressStore();
