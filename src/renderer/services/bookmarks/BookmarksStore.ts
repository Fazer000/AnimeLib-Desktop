import { animeApi, BookmarkItem } from '../../api/animeApi';

import { createLogger } from '../../../shared/logger';

const log = createLogger('BookmarksStore');

export type BookmarksListener = (items: BookmarkItem[]) => void;

const REFRESH_DELAY_MS = 400;

/**
 * Единый источник закладок «Смотрю» с подпиской на изменения
 */
export class BookmarksStore {
  private items: BookmarkItem[] = [];

  private signature: string = '';

  private listeners = new Set<BookmarksListener>();

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  private isLoading: boolean = false;

  private isQueued: boolean = false;

  /**
   * Возвращает текущий список без обращения к сети
   */
  getItems(): BookmarkItem[] {
    return this.items;
  }

  /**
   * Подписывает слушателя и сразу отдаёт текущий список
   */
  subscribe(listener: BookmarksListener): () => void {
    this.listeners.add(listener);
    listener(this.items);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Перезагружает список с сервера, склеивая частые вызовы
   */
  refresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.load();
    }, REFRESH_DELAY_MS);
  }

  /**
   * Загружает список, не допуская параллельных запросов
   */
  private async load(): Promise<void> {
    if (this.isLoading) {
      this.isQueued = true;
      return;
    }

    this.isLoading = true;

    try {
      this.setItems(await animeApi.getWatchingBookmarks());
    } catch (error) {
      log.error('Failed to refresh bookmarks:', error);
    } finally {
      this.isLoading = false;

      if (this.isQueued) {
        this.isQueued = false;
        this.load();
      }
    }
  }

  /**
   * Обновляет список и уведомляет подписчиков при реальном изменении
   */
  private setItems(items: BookmarkItem[]): void {
    const signature = BookmarksStore.getSignature(items);

    if (signature === this.signature) {
      return;
    }

    this.signature = signature;
    this.items = items;

    log.debug('Bookmarks updated:', items.length);
    this.listeners.forEach((listener) => listener(items));
  }

  /**
   * Строит сигнатуру списка для сравнения
   */
  private static getSignature(items: BookmarkItem[]): string {
    return items
      .map((item) => `${item.animeSlugUrl}:${item.episodeNumber}`)
      .join('|');
  }
}

export const bookmarksStore = new BookmarksStore();
