/**
 * Зеркало состояния оффлайн-библиотеки в renderer
 */
import {
  DownloadRequest,
  OfflineDirectoryResult,
  OfflineEpisode,
  OfflineMigrationProgress,
  OfflineRemovalEvent,
  OfflineSnapshot,
} from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('OfflineStore');

type Listener = (snapshot: OfflineSnapshot) => void;

type RemovalListener = (fileNames: string[]) => void;

type MigrationListener = (progress: OfflineMigrationProgress) => void;

const EMPTY_SNAPSHOT: OfflineSnapshot = {
  anime: [],
  tasks: [],
  downloadsPath: '',
};

class OfflineStore {
  private snapshot: OfflineSnapshot = EMPTY_SNAPSHOT;

  private listeners: Set<Listener> = new Set();

  private removalListeners: Set<RemovalListener> = new Set();

  private migrationListeners: Set<MigrationListener> = new Set();

  private activeFile: string = '';

  private installed: boolean = false;

  /**
   * Возвращает мост в main-процесс
   */
  // eslint-disable-next-line class-methods-use-this
  private get api(): any {
    return window.electron?.electronAPI;
  }

  /**
   * Подписывает слушателя на изменения
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.install();
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Подключает события main-процесса один раз
   */
  private install(): void {
    if (this.installed) {
      return;
    }

    const ipc = window.electron?.ipcRenderer;

    if (!ipc) {
      return;
    }

    this.installed = true;
    this.resume();
    ipc.on('offline-tasks-changed', () => this.refresh());
    ipc.on('offline-library-changed', () => this.refresh());
    ipc.on('offline-files-removed', (...args: unknown[]) =>
      this.emitRemoval((args[0] as OfflineRemovalEvent)?.fileNames || []),
    );
    ipc.on('offline-file-missing', (...args: unknown[]) =>
      this.emitRemoval([args[0] as string]),
    );
    ipc.on('offline-migration-progress', (...args: unknown[]) =>
      this.migrationListeners.forEach((listener) =>
        listener(args[0] as OfflineMigrationProgress),
      ),
    );
    this.refresh();
  }

  /**
   * Подписывает слушателя на удаление файлов
   */
  public onFilesRemoved(listener: RemovalListener): () => void {
    this.removalListeners.add(listener);
    this.install();

    return () => {
      this.removalListeners.delete(listener);
    };
  }

  /**
   * Оповещает слушателей об удалённых файлах
   */
  private emitRemoval(fileNames: string[]): void {
    if (fileNames.length === 0) {
      return;
    }

    log.warn('Files removed:', fileNames.length);
    this.removalListeners.forEach((listener) => listener(fileNames));
  }

  /**
   * Запоминает файл, который сейчас воспроизводится
   */
  public setActiveFile(fileName: string): void {
    this.activeFile = fileName;
  }

  /**
   * Возвращает файл, который сейчас воспроизводится
   */
  public getActiveFile(): string {
    return this.activeFile;
  }

  /**
   * Запрашивает актуальный снимок
   */
  public async refresh(): Promise<void> {
    if (!this.api?.offlineGetSnapshot) {
      return;
    }

    try {
      this.snapshot = await this.api.offlineGetSnapshot();
      this.listeners.forEach((listener) => listener(this.snapshot));
    } catch (error) {
      log.error('Refresh failed:', error);
    }
  }

  /**
   * Сверяет каталог с диском и обновляет снимок
   */
  public async verify(): Promise<void> {
    const removed = await this.api?.offlineVerify?.().catch(() => 0);

    if (removed) {
      log.warn('Missing episodes removed:', removed);
    }

    await this.refresh();
  }

  /**
   * Возвращает текущий снимок
   */
  public getSnapshot(): OfflineSnapshot {
    return this.snapshot;
  }

  /**
   * Возвращает скачанные варианты серии
   */
  public findEpisodes(episodeId: number, playerId?: number): OfflineEpisode[] {
    return this.snapshot.anime
      .flatMap((item) => item.episodes)
      .filter(
        (episode) =>
          episode.episodeId === episodeId &&
          (playerId === undefined || episode.playerId === playerId),
      );
  }

  /**
   * Ставит серии в очередь загрузки
   */
  public async enqueue(requests: DownloadRequest[]): Promise<void> {
    await this.api?.offlineEnqueue?.(requests);
    await this.refresh();
  }

  /**
   * Читает токен авторизации сайта
   */
  private static readAuthToken(): string {
    try {
      const raw = localStorage.getItem('animeLibAuthToken');
      return raw ? JSON.parse(raw).access_token || '' : '';
    } catch {
      return '';
    }
  }

  /**
   * Возобновляет приостановленные и упавшие загрузки
   */
  public async resume(taskId?: string): Promise<void> {
    const resumed = await this.api
      ?.offlineResume?.({ authToken: OfflineStore.readAuthToken(), taskId })
      .catch(() => 0);

    if (resumed) {
      log.debug('Resumed downloads:', resumed);
    }

    await this.refresh();
  }

  /**
   * Отменяет задачу
   */
  public async cancel(taskId: string): Promise<void> {
    await this.api?.offlineCancelTask?.(taskId);
    await this.refresh();
  }

  /**
   * Отменяет все незавершённые задачи
   */
  public async cancelAll(): Promise<void> {
    const cancelled = await this.api?.offlineCancelAll?.().catch(() => 0);

    if (cancelled) {
      log.debug('Cancelled all downloads:', cancelled);
    }

    await this.refresh();
  }

  /**
   * Очищает завершенные задачи
   */
  public async clearFinished(): Promise<void> {
    await this.api?.offlineClearFinished?.();
    await this.refresh();
  }

  /**
   * Удаляет скачанную серию
   */
  public async removeEpisode(
    animeId: string,
    episodeId: number,
    playerId: number,
    quality: string,
  ): Promise<void> {
    await this.api?.offlineRemoveEpisode?.({
      animeId,
      episodeId,
      playerId,
      quality,
    });
    await this.refresh();
  }

  /**
   * Удаляет аниме целиком
   */
  public async removeAnime(animeId: string): Promise<void> {
    await this.api?.offlineRemoveAnime?.(animeId);
    await this.refresh();
  }

  /**
   * Подписывает слушателя на прогресс переноса
   */
  public onMigrationProgress(listener: MigrationListener): () => void {
    this.migrationListeners.add(listener);
    this.install();

    return () => {
      this.migrationListeners.delete(listener);
    };
  }

  /**
   * Меняет директорию загрузок с переносом файлов
   */
  public async chooseDirectory(): Promise<OfflineDirectoryResult | null> {
    const result = await this.api?.offlineChooseDirectory?.().catch(() => null);

    await this.refresh();

    return result || null;
  }

  /**
   * Открывает директорию загрузок
   */
  public openDirectory(): void {
    this.api?.offlineOpenDirectory?.();
  }

  /**
   * Возвращает свободное место в папке загрузок
   */
  public async getFreeSpace(): Promise<number> {
    const free = await this.api?.offlineGetFreeSpace?.().catch(() => 0);

    return free || 0;
  }
}

// eslint-disable-next-line import/prefer-default-export
export const offlineStore = new OfflineStore();
