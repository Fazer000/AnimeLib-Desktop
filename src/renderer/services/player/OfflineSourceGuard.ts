/**
 * Наблюдение за исчезновением локального файла активного источника
 */
import { parseOfflineFileName } from '../../../constants';
import { offlineStore } from '../offline';
import { checkConnection } from '../../utils/connectivity';

import { createLogger } from '../../../shared/logger';

const log = createLogger('OfflineSourceGuard');

export interface OfflineSourceGuardConfig {
  onSourceLost: (fileName: string) => void;
}

export class OfflineSourceGuard {
  private fileName: string = '';

  private unsubscribe: (() => void) | null = null;

  private config: OfflineSourceGuardConfig;

  constructor(config: OfflineSourceGuardConfig) {
    this.config = config;
  }

  /**
   * Проверяет доступность сети
   */
  public static async isOnline(): Promise<boolean> {
    return checkConnection();
  }

  /**
   * Берёт источник под наблюдение
   */
  public watch(src: string): void {
    this.reset();

    const fileName = parseOfflineFileName(src);

    if (!fileName) {
      return;
    }

    this.fileName = fileName;
    offlineStore.setActiveFile(fileName);
    this.unsubscribe = offlineStore.onFilesRemoved((fileNames) =>
      this.handleRemoved(fileNames),
    );

    log.debug('Watching:', fileName);
  }

  /**
   * Снимает наблюдение
   */
  public reset(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;

    if (this.fileName) {
      offlineStore.setActiveFile('');
      this.fileName = '';
    }
  }

  /**
   * Реагирует на удаление файлов
   */
  private handleRemoved(fileNames: string[]): void {
    const base = this.fileName.split('.')[0];

    if (!base || !fileNames.some((name) => name.startsWith(base))) {
      return;
    }

    const lost = this.fileName;
    this.reset();

    log.warn('Source lost:', lost);
    this.config.onSourceLost(lost);
  }
}
