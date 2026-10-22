import { createLogger } from '../../../shared/logger';

const log = createLogger('SiteBookmarksStore');

/** Загружает закладки одной папки сайта как их отдаёт API */
export type SiteBookmarksLoader = (
  siteId: number,
  status: number,
) => Promise<unknown[]>;

export interface SiteBookmarksSnapshot {
  items: unknown[];
  /** Список хотя бы раз загружен: до этого показывается «Загрузка…» */
  loaded: boolean;
}

export type SiteBookmarksListener = (snapshot: SiteBookmarksSnapshot) => void;

interface Entry extends SiteBookmarksSnapshot {
  signature: string;
  siteId: number;
  status: number;
  loading: boolean;
  queued: boolean;
  listeners: Set<SiteBookmarksListener>;
}

interface RawItem {
  media?: { slug_url?: string } | null;
  item?: { volume?: unknown; number?: unknown } | null;
  meta?: { item_number?: unknown } | null;
}

const EMPTY: SiteBookmarksSnapshot = { items: [], loaded: false };

/**
 * Ключ записи: свой список у каждого пользователя, сайта и папки
 */
export function siteBookmarksKey(
  userId: string,
  siteId: number,
  status: number,
): string {
  return `${userId}:${siteId}:${status}`;
}

/**
 * Сигнатура списка: тайтл и его глава или серия. Подписчики узнают
 * о новом списке, только если она изменилась
 */
export function siteBookmarksSignature(items: unknown[]): string {
  return (items as RawItem[])
    .map((raw) => {
      const item = raw?.item;
      const position = item
        ? `${item.volume ?? ''}/${item.number ?? ''}`
        : String(raw?.meta?.item_number ?? '');
      return `${raw?.media?.slug_url ?? ''}:${position}`;
    })
    .join('|');
}

/**
 * Списки папок сайтов в памяти: «Запланировано», «Любимое» и «Читаю».
 * Как у быстрых закладок, подменю открывается сразу с сохранённым
 * списком, а свежий приходит в фоне; после изменения закладок открытые
 * списки перезагружаются
 */
export class SiteBookmarksStore {
  private readonly entries = new Map<string, Entry>();

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly loader: SiteBookmarksLoader;

  private readonly refreshDelayMs: number;

  constructor(loader: SiteBookmarksLoader, refreshDelayMs: number) {
    this.loader = loader;
    this.refreshDelayMs = refreshDelayMs;
  }

  /** Сохранённый список без обращения к сети */
  get(key: string): SiteBookmarksSnapshot {
    const entry = this.entries.get(key);
    return entry ? { items: entry.items, loaded: entry.loaded } : EMPTY;
  }

  /** Подписывает на список и сразу отдаёт сохранённый */
  subscribe(
    key: string,
    siteId: number,
    status: number,
    listener: SiteBookmarksListener,
  ): () => void {
    const entry = this.entry(key, siteId, status);
    entry.listeners.add(listener);
    listener(this.get(key));

    return () => {
      entry.listeners.delete(listener);
    };
  }

  /** Загружает список; повторный вызов во время загрузки — ещё один круг */
  async load(key: string, siteId: number, status: number): Promise<void> {
    const entry = this.entry(key, siteId, status);
    if (entry.loading) {
      entry.queued = true;
      return;
    }

    entry.loading = true;
    try {
      SiteBookmarksStore.apply(entry, await this.loader(siteId, status));
    } catch (error) {
      log.error('Failed to load site bookmarks:', siteId, status, error);
      if (!entry.loaded) SiteBookmarksStore.apply(entry, []);
    } finally {
      entry.loading = false;
      if (entry.queued) {
        entry.queued = false;
        this.load(key, siteId, status);
      }
    }
  }

  /**
   * Закладки изменились: открытые списки перезагружаются (склеивая
   * частые вызовы), остальные — при следующем открытии
   */
  invalidate(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.entries.forEach((entry, key) => {
        if (entry.listeners.size > 0) {
          this.load(key, entry.siteId, entry.status);
        }
      });
    }, this.refreshDelayMs);
  }

  private entry(key: string, siteId: number, status: number): Entry {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        items: [],
        loaded: false,
        signature: '',
        siteId,
        status,
        loading: false,
        queued: false,
        listeners: new Set(),
      };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private static apply(entry: Entry, items: unknown[]): void {
    const signature = siteBookmarksSignature(items);
    if (entry.loaded && signature === entry.signature) return;

    entry.signature = signature;
    entry.items = items;
    entry.loaded = true;

    const snapshot = { items, loaded: true };
    entry.listeners.forEach((listener) => listener(snapshot));
  }
}
