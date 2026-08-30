/**
 * Очередь загрузки серий с докачкой и восстановлением после перезапуска
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import {
  DownloadRequest,
  DownloadStatus,
  DownloadTask,
  OFFLINE_DOWNLOAD_RETRIES,
  OFFLINE_MAX_PARALLEL_DOWNLOADS,
  OFFLINE_MIN_FREE_SPACE_BYTES,
  OFFLINE_PROGRESS_THROTTLE_MS,
  OFFLINE_DOWNLOADABLE_PLAYER,
  OFFLINE_QUEUE_FILE,
  OFFLINE_RETRY_DELAY_MS,
  OFFLINE_PARALLEL_CONNECTIONS,
  OfflineEpisode,
} from '../../constants';
import { offlineLibrary } from './OfflineLibrary';
import { hlsDownloader } from './HlsDownloader';
import { parallelDownloader } from './ParallelDownloader';
import { KODIK_HEADERS } from './httpClient';

import { createLogger } from '../../shared/logger';

const log = createLogger('DownloadManager');

interface QueueItem {
  task: DownloadTask;
  request: DownloadRequest;
  abort?: () => void;
}

type DownloadOutcome = 'completed' | 'failed' | 'no-space';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

const ACTIVE_STATUSES: DownloadStatus[] = ['queued', 'downloading', 'paused'];

class DownloadManager {
  private queue: QueueItem[] = [];

  private active: number = 0;

  // eslint-disable-next-line class-methods-use-this
  private getWindow: () => BrowserWindow | null = () => null;

  /**
   * Задает источник окна для событий прогресса
   */
  public attach(getWindow: () => BrowserWindow | null): void {
    this.getWindow = getWindow;
  }

  /**
   * Возвращает текущие задачи
   */
  public getTasks(): DownloadTask[] {
    return this.queue.map((item) => item.task);
  }

  /**
   * Возвращает файлы незавершённых задач
   */
  public getReservedFiles(): string[] {
    return this.queue
      .filter((item) => ACTIVE_STATUSES.includes(item.task.status))
      .flatMap((item) => [
        `${item.task.id}.bin`,
        `${item.task.id}.ts`,
        `${item.task.id}.m3u8`,
      ]);
  }

  /**
   * Уведомляет renderer об изменении состояния
   */
  private notify(channel: 'offline-tasks-changed' | 'offline-library-changed') {
    this.getWindow()?.webContents.send(channel);
  }

  /**
   * Возвращает путь к файлу очереди
   */
  // eslint-disable-next-line class-methods-use-this
  private queueFile(): string {
    return offlineLibrary.resolveFile(OFFLINE_QUEUE_FILE);
  }

  /**
   * Сохраняет незавершённые задачи на диск без токена
   */
  private persist(): void {
    const pending = this.queue
      .filter((item) => ACTIVE_STATUSES.includes(item.task.status))
      .map((item) => ({
        task: { ...item.task, status: 'paused' as DownloadStatus },
        request: { ...item.request, authToken: '' },
      }));

    try {
      if (pending.length === 0) {
        fs.rmSync(this.queueFile(), { force: true });
        return;
      }

      fs.writeFileSync(
        this.queueFile(),
        JSON.stringify({ pending }, null, 2),
        'utf8',
      );
    } catch (error) {
      log.error('Failed to persist queue:', error);
    }
  }

  /**
   * Восстанавливает очередь после перезапуска
   */
  public restore(): void {
    try {
      const raw = fs.readFileSync(this.queueFile(), 'utf8');
      const parsed = JSON.parse(raw);
      const pending: QueueItem[] = Array.isArray(parsed?.pending)
        ? parsed.pending
        : [];

      pending.forEach((entry) => {
        this.queue.push({
          task: { ...entry.task, status: 'paused', error: '' },
          request: entry.request,
        });
      });

      if (this.queue.length > 0) {
        log.debug('Restored tasks:', this.queue.length);
      }
    } catch {
      this.queue = [];
    }
  }

  /**
   * Возобновляет приостановленные и упавшие задачи
   */
  public resume(authToken: string, taskId?: string): number {
    const targets = this.queue.filter(
      (item) =>
        (item.task.status === 'paused' || item.task.status === 'error') &&
        (!taskId || item.task.id === taskId),
    );

    targets.forEach((item) => {
      // eslint-disable-next-line no-param-reassign
      item.task.status = 'queued';
      // eslint-disable-next-line no-param-reassign
      item.task.error = '';

      if (authToken) {
        // eslint-disable-next-line no-param-reassign
        item.request.authToken = authToken;
      }
    });

    if (targets.length === 0) {
      return 0;
    }

    log.debug('Resuming tasks:', targets.length);
    this.notify('offline-tasks-changed');
    this.persist();
    this.pump();

    return targets.length;
  }

  /**
   * Добавляет запросы в очередь
   */
  public enqueue(requests: DownloadRequest[]): DownloadTask[] {
    const created = requests
      .filter(
        (request) =>
          !offlineLibrary.hasEpisode(
            request.episodeId,
            request.playerId,
            request.quality,
          ),
      )
      .map((request) => {
        const task: DownloadTask = {
          id: randomUUID(),
          animeId: request.animeId,
          animeTitle: request.animeTitle,
          episodeId: request.episodeId,
          episodeNumber: request.episodeNumber,
          quality: request.quality,
          teamName: request.teamName,
          status: 'queued',
          progress: 0,
          loadedBytes: 0,
          totalBytes: 0,
          error: '',
        };

        this.queue.push({ task, request });
        return task;
      });

    this.notify('offline-tasks-changed');
    this.persist();
    this.pump();

    return created;
  }

  /**
   * Отменяет задачу
   */
  public cancel(taskId: string): void {
    const item = this.queue.find((entry) => entry.task.id === taskId);

    if (!item) {
      return;
    }

    if (item.task.status === 'downloading') {
      item.abort?.();
    }

    item.task.status = 'cancelled';

    ['.bin', '.ts', '.m3u8', '.ts.part.json', '.bin.parts.json'].forEach(
      (suffix) => {
        try {
          fs.rmSync(offlineLibrary.resolveFile(`${taskId}${suffix}`), {
            force: true,
          });
        } catch (error) {
          log.error('Failed to remove partial:', error);
        }
      },
    );

    this.notify('offline-tasks-changed');
    this.persist();
    this.pump();
  }

  /**
   * Убирает завершенные и отмененные задачи из списка
   */
  public clearFinished(): void {
    this.queue = this.queue.filter((item) =>
      ACTIVE_STATUSES.includes(item.task.status),
    );
    this.notify('offline-tasks-changed');
    this.persist();
  }

  /**
   * Запускает следующие задачи при наличии свободных слотов
   */
  private pump(): void {
    while (this.active < OFFLINE_MAX_PARALLEL_DOWNLOADS) {
      const next = this.queue.find((item) => item.task.status === 'queued');

      if (!next) {
        return;
      }

      this.active += 1;
      this.run(next);
    }
  }

  /**
   * Задержка перед повторной попыткой
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Возвращает размер частично скачанного файла
   */
  private static getFileSize(target: string): number {
    try {
      return fs.statSync(target).size;
    } catch {
      return 0;
    }
  }

  /**
   * Проверяет наличие свободного места под остаток файла
   */
  private static hasFreeSpace(destination: string, needed: number): boolean {
    try {
      const stats = fs.statfsSync(path.dirname(destination));
      const free = stats.bavail * stats.bsize;

      return free > needed + OFFLINE_MIN_FREE_SPACE_BYTES;
    } catch {
      return true;
    }
  }

  /**
   * Выполняет одну задачу
   */
  private async run(item: QueueItem): Promise<void> {
    const { task, request } = item;

    task.status = 'downloading';
    this.notify('offline-tasks-changed');
    this.persist();

    const isCancelled = () => (task.status as DownloadStatus) === 'cancelled';

    let lastHlsNotify = 0;
    let lastParallelNotify = 0;

    try {
      const isHls = request.sourceType === 'hls';
      const fileName = isHls ? `${task.id}.ts` : `${task.id}.bin`;
      const playlistFileName = isHls ? `${task.id}.m3u8` : '';
      const target = offlineLibrary.resolveFile(fileName);
      const sources = [request.videoUrl, ...request.fallbackUrls];

      let outcome: 'completed' | 'failed' | 'cancelled' | 'no-space' = 'failed';

      if (isHls) {
        const result = await hlsDownloader.download({
          url: request.videoUrl,
          headers: KODIK_HEADERS,
          mediaPath: target,
          playlistPath: offlineLibrary.resolveFile(playlistFileName),
          mediaFileName: fileName,
          isCancelled,
          onProgress: (loaded, percent) => {
            task.loadedBytes = loaded;
            task.totalBytes = 0;
            task.progress = percent;

            const now = Date.now();
            if (now - lastHlsNotify > OFFLINE_PROGRESS_THROTTLE_MS) {
              lastHlsNotify = now;
              this.notify('offline-tasks-changed');
            }
          },
        });

        outcome = result.outcome === 'cancelled' ? 'failed' : result.outcome;
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const source of isHls ? [] : sources) {
        // eslint-disable-next-line no-plusplus
        for (let attempt = 1; attempt <= OFFLINE_DOWNLOAD_RETRIES; attempt++) {
          if (isCancelled()) {
            break;
          }

          // eslint-disable-next-line no-await-in-loop
          const parallel = await parallelDownloader.download({
            url: source,
            headers: DownloadManager.buildHeaders(request),
            destination: target,
            connections: OFFLINE_PARALLEL_CONNECTIONS,
            // eslint-disable-next-line no-loop-func
            onProgress: (loaded, total) => {
              task.loadedBytes = loaded;
              task.totalBytes = total;
              task.progress = Math.round((loaded / total) * 100);

              const now = Date.now();

              if (now - lastParallelNotify > OFFLINE_PROGRESS_THROTTLE_MS) {
                lastParallelNotify = now;
                this.notify('offline-tasks-changed');
              }
            },
            registerAbort: (abort) => {
              item.abort = abort;
            },
          });

          outcome =
            parallel === 'unsupported'
              ? // eslint-disable-next-line no-await-in-loop
                await this.downloadFile(item, source, target)
              : parallel;

          if (outcome === 'cancelled') {
            outcome = 'failed';
          }

          if (outcome !== 'failed') {
            break;
          }

          if (attempt < OFFLINE_DOWNLOAD_RETRIES) {
            log.warn(`Retry ${attempt} for episode ${request.episodeNumber}`);
            // eslint-disable-next-line no-await-in-loop
            await DownloadManager.delay(OFFLINE_RETRY_DELAY_MS);
          }
        }

        if (outcome !== 'failed' || isCancelled()) {
          break;
        }
      }

      if (isCancelled()) {
        fs.rmSync(target, { force: true });
        return;
      }

      if (outcome === 'no-space') {
        task.status = 'error';
        task.error = 'Недостаточно места на диске';
        return;
      }

      if (outcome !== 'completed') {
        task.status = 'error';
        task.error = 'Не удалось скачать видео';
        return;
      }

      const subtitles = await this.downloadSubtitles(request);
      const coverFileName = await this.downloadCover(request);

      const episode: OfflineEpisode = {
        episodeId: request.episodeId,
        episodeNumber: request.episodeNumber,
        episodeName: request.episodeName,
        season: request.season,
        playerId: request.playerId,
        playerType: request.playerType,
        teamId: request.teamId,
        teamName: request.teamName,
        translationTypeId: request.translationTypeId,
        translationLabel: request.translationLabel,
        quality: request.quality,
        fileName,
        playlistFileName,
        fileSize: fs.statSync(target).size,
        timecode: request.timecode,
        subtitles,
        createdAt: new Date().toISOString(),
      };

      offlineLibrary.addEpisode(
        request.animeId,
        {
          title: request.animeTitle,
          coverUrl: request.coverUrl,
          rating: request.animeRating,
          year: request.animeYear,
          totalEpisodes: request.animeTotalEpisodes,
        },
        episode,
        coverFileName,
      );

      task.status = 'completed';
      task.progress = 100;
      this.notify('offline-library-changed');
      log.debug('Completed:', request.episodeNumber);
    } catch (error: any) {
      task.status = 'error';
      task.error = error?.message || 'Ошибка загрузки';
      log.error('Failed:', error);
    } finally {
      this.active -= 1;
      this.notify('offline-tasks-changed');
      this.persist();
      this.pump();
    }
  }

  /**
   * Скачивает файл с докачкой и отчетом о прогрессе
   */
  private downloadFile(
    item: QueueItem,
    url: string,
    destination: string,
    redirects = 5,
  ): Promise<DownloadOutcome> {
    const { task, request } = item;

    return new Promise((resolve) => {
      const existing = DownloadManager.getFileSize(destination);
      const headers = DownloadManager.buildHeaders(request);

      if (existing > 0) {
        headers.Range = `bytes=${existing}-`;
      }

      const httpRequest = https.get(url, { headers }, (response) => {
        const { statusCode, headers: responseHeaders } = response;

        if (
          statusCode &&
          statusCode >= 300 &&
          statusCode < 400 &&
          responseHeaders.location &&
          redirects > 0
        ) {
          response.resume();
          resolve(
            this.downloadFile(
              item,
              new URL(responseHeaders.location, url).href,
              destination,
              redirects - 1,
            ),
          );
          return;
        }

        if (statusCode === 416) {
          log.debug('File already complete');
          response.resume();
          resolve('completed');
          return;
        }

        if (!statusCode || statusCode >= 400) {
          response.resume();
          resolve('failed');
          return;
        }

        const contentType = String(responseHeaders['content-type'] || '');

        if (/text\/html|application\/json|text\/plain/i.test(contentType)) {
          log.error('Unexpected content-type:', contentType);
          response.resume();
          resolve('failed');
          return;
        }

        const isPartial = statusCode === 206 && existing > 0;
        const startByte = isPartial ? existing : 0;
        const remaining = Number(responseHeaders['content-length']) || 0;
        const total = remaining > 0 ? startByte + remaining : 0;

        if (!DownloadManager.hasFreeSpace(destination, remaining)) {
          log.error('Not enough free space');
          response.destroy();
          resolve('no-space');
          return;
        }

        if (existing > 0 && !isPartial) {
          log.warn('Range ignored, restarting download');
        }

        const file = fs.createWriteStream(destination, {
          flags: isPartial ? 'a' : 'w',
        });

        let loaded = startByte;
        let lastNotify = 0;

        task.totalBytes = total;

        item.abort = () => {
          httpRequest.destroy();
          file.destroy();
        };

        response.on('data', (chunk: Buffer) => {
          loaded += chunk.length;
          task.loadedBytes = loaded;

          if (total > 0) {
            task.progress = Math.round((loaded / total) * 100);
          }

          const now = Date.now();
          if (now - lastNotify > OFFLINE_PROGRESS_THROTTLE_MS) {
            lastNotify = now;
            this.notify('offline-tasks-changed');
          }
        });

        response.pipe(file);

        file.on('finish', () =>
          file.close(() => {
            const complete = total === 0 || loaded === total;

            if (!complete) {
              log.error(`Incomplete: ${loaded} of ${total} bytes`);
            }

            resolve(complete ? 'completed' : 'failed');
          }),
        );

        file.on('error', () => resolve('failed'));
        response.on('error', () => resolve('failed'));
      });

      httpRequest.on('error', () => resolve('failed'));
      httpRequest.end();
    });
  }

  /**
   * Собирает заголовки под источник загрузки
   */
  private static buildHeaders(
    request: DownloadRequest,
  ): Record<string, string> {
    if (request.playerType !== OFFLINE_DOWNLOADABLE_PLAYER) {
      return { ...KODIK_HEADERS };
    }

    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
      'Accept-Language': 'ru,en;q=0.9',
      Referer: `${request.siteOrigin}/`,
      Origin: request.siteOrigin,
    };

    if (request.authToken) {
      headers.Authorization = `Bearer ${request.authToken}`;
      headers['Site-Id'] = '5';
    }

    return headers;
  }

  /**
   * Скачивает обложку аниме, если её ещё нет
   */
  private async downloadCover(request: DownloadRequest): Promise<string> {
    const existing = offlineLibrary.getCoverFileName(request.animeId);

    if (existing || !request.coverUrl) {
      return existing;
    }

    const fileName = `${randomUUID()}.img`;
    const target = offlineLibrary.resolveFile(fileName);
    const outcome = await this.downloadFile(
      DownloadManager.createSilentItem(request),
      request.coverUrl,
      target,
    );

    return outcome === 'completed' ? fileName : '';
  }

  /**
   * Создает служебную задачу без отчета о прогрессе
   */
  private static createSilentItem(request: DownloadRequest): QueueItem {
    return {
      task: {
        id: '',
        animeId: '',
        animeTitle: '',
        episodeId: 0,
        episodeNumber: '',
        quality: '',
        teamName: '',
        status: 'downloading',
        progress: 0,
        loadedBytes: 0,
        totalBytes: 0,
        error: '',
      },
      request,
    };
  }

  /**
   * Скачивает файлы субтитров серии
   */
  private async downloadSubtitles(
    request: DownloadRequest,
  ): Promise<Array<{ name: string; format: string; fileName: string }>> {
    const result: Array<{ name: string; format: string; fileName: string }> =
      [];

    // eslint-disable-next-line no-restricted-syntax
    for (const subtitle of request.subtitles) {
      const fileName = `${randomUUID()}${path.extname(subtitle.src) || '.txt'}`;
      const target = offlineLibrary.resolveFile(fileName);

      // eslint-disable-next-line no-await-in-loop
      const outcome = await this.downloadFile(
        DownloadManager.createSilentItem(request),
        subtitle.src,
        target,
      );

      if (outcome === 'completed') {
        result.push({
          name: subtitle.name,
          format: subtitle.format,
          fileName,
        });
      }
    }

    return result;
  }
}

// eslint-disable-next-line import/prefer-default-export
export const downloadManager = new DownloadManager();
