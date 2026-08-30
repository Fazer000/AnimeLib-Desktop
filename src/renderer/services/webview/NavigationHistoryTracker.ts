import { createLogger } from '../../../shared/logger';

const log = createLogger('NavHistory');

/**
 * Источник перехода
 */
export type NavigationSource =
  | 'navigate'
  | 'in-page'
  | 'back'
  | 'forward'
  | 'reload'
  | 'home-reset'
  | 'player-open'
  | 'player-close';

/**
 * Запись журнала переходов
 */
export interface NavigationRecord {
  index: number;
  source: NavigationSource;
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  time: string;
}

const DEBUG_STORAGE_KEY = 'animeLibNavDebug';
const MAX_RECORDS = 200;

/**
 * Журнал переходов для отладки навигации
 */
export class NavigationHistoryTracker {
  private static records: NavigationRecord[] = [];

  private static counter: number = 0;

  private static enabled: boolean | null = null;

  /**
   * Включена ли отладочная печать
   */
  static isEnabled(): boolean {
    if (NavigationHistoryTracker.enabled === null) {
      try {
        NavigationHistoryTracker.enabled =
          localStorage.getItem(DEBUG_STORAGE_KEY) === 'true';
      } catch {
        NavigationHistoryTracker.enabled = false;
      }
    }
    return NavigationHistoryTracker.enabled;
  }

  /**
   * Включает или выключает отладочную печать
   */
  static setEnabled(enabled: boolean): void {
    NavigationHistoryTracker.enabled = enabled;
    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, enabled.toString());
    } catch (error) {
      log.error('Error saving debug flag:', error);
    }
    log.debug(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Записывает переход в журнал
   */
  static record(entry: {
    source: NavigationSource;
    url: string;
    canGoBack?: boolean;
    canGoForward?: boolean;
  }): void {
    NavigationHistoryTracker.counter += 1;

    const record: NavigationRecord = {
      index: NavigationHistoryTracker.counter,
      source: entry.source,
      url: entry.url,
      canGoBack: entry.canGoBack ?? false,
      canGoForward: entry.canGoForward ?? false,
      time: new Date().toISOString().slice(11, 23),
    };

    NavigationHistoryTracker.records.push(record);

    if (NavigationHistoryTracker.records.length > MAX_RECORDS) {
      NavigationHistoryTracker.records.shift();
    }

    if (NavigationHistoryTracker.isEnabled()) {
      log.debug(
        `#${record.index} ${record.source} | back:${record.canGoBack} fwd:${record.canGoForward} | ${record.url}`,
      );
    }
  }

  /**
   * Возвращает копию журнала
   */
  static getRecords(): NavigationRecord[] {
    return [...NavigationHistoryTracker.records];
  }

  /**
   * Печатает журнал таблицей
   */
  static print(): void {
    // eslint-disable-next-line no-console
    console.table(NavigationHistoryTracker.records);
  }

  /**
   * Очищает журнал
   */
  static clear(): void {
    NavigationHistoryTracker.records = [];
    NavigationHistoryTracker.counter = 0;
    log.debug('Records cleared');
  }

  /**
   * Публикует отладочный API в window
   */
  static install(): void {
    window.animeLibNav = {
      on: () => NavigationHistoryTracker.setEnabled(true),
      off: () => NavigationHistoryTracker.setEnabled(false),
      print: () => NavigationHistoryTracker.print(),
      records: () => NavigationHistoryTracker.getRecords(),
      clear: () => NavigationHistoryTracker.clear(),
    };
    log.debug('Debug API available: window.animeLibNav');
  }
}
