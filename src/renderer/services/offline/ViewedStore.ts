/* eslint-disable no-console */

/**
 * Локальные отметки просмотра с отложенной синхронизацией
 */
import { OFFLINE_VIEWED_STORAGE_KEY, OfflineViewed } from '../../../constants';

type ViewedMap = Record<string, OfflineViewed>;

/**
 * Строит ключ отметки
 */
const buildKey = (animeId: string, playerId: number): string =>
  `${animeId}:${playerId}`;

class ViewedStore {
  /**
   * Читает все отметки
   */
  // eslint-disable-next-line class-methods-use-this
  public getAll(): ViewedMap {
    try {
      const raw = localStorage.getItem(OFFLINE_VIEWED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Записывает все отметки
   */
  // eslint-disable-next-line class-methods-use-this
  private setAll(map: ViewedMap): void {
    try {
      localStorage.setItem(OFFLINE_VIEWED_STORAGE_KEY, JSON.stringify(map));
    } catch (error) {
      console.error('[ViewedStore] Save failed:', error);
    }
  }

  /**
   * Проверяет наличие отметки
   */
  public isMarked(animeId: string, playerId: number): boolean {
    return Boolean(this.getAll()[buildKey(animeId, playerId)]);
  }

  /**
   * Ставит отметку просмотра
   */
  public mark(entry: Omit<OfflineViewed, 'updatedAt'>): void {
    const map = this.getAll();
    const key = buildKey(entry.animeId, entry.playerId);

    if (map[key]?.synced) {
      return;
    }

    map[key] = { ...entry, updatedAt: new Date().toISOString() };
    this.setAll(map);
  }

  /**
   * Возвращает отметки, ещё не отправленные на сайт
   */
  public getPending(): OfflineViewed[] {
    return Object.values(this.getAll()).filter((item) => !item.synced);
  }

  /**
   * Помечает отметку синхронизированной
   */
  public markSynced(animeId: string, playerId: number): void {
    const map = this.getAll();
    const key = buildKey(animeId, playerId);

    if (map[key]) {
      map[key].synced = true;
      this.setAll(map);
    }
  }
}

// eslint-disable-next-line import/prefer-default-export
export const viewedStore = new ViewedStore();
