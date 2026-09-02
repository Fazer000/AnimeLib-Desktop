/**
 * IPC обработчики оффлайн-библиотеки
 */
import https from 'https';
import { BrowserWindow, dialog, shell } from 'electron';
import {
  CONNECTIVITY_CHECK_TIMEOUT_MS,
  CONNECTIVITY_PROBE_URL,
  DownloadRequest,
  OfflineDirectoryResult,
  OfflineRemovalEvent,
  OfflineSnapshot,
} from '../../constants';
import { offlineLibrary } from './OfflineLibrary';
import { downloadManager } from './DownloadManager';

import { createLogger } from '../../shared/logger';
import { handleIpc, onIpc } from '../ipc';

const log = createLogger('Offline');

export {
  registerOfflineProtocol,
  registerOfflineSchemes,
} from './offlineProtocol';
/**
 * Собирает снимок состояния для renderer
 */
const buildSnapshot = (): OfflineSnapshot => ({
  anime: offlineLibrary.getAnime(),
  tasks: downloadManager.getTasks(),
  downloadsPath: offlineLibrary.getDownloadsPath(),
});

/**
 * Рассылает renderer сведения об удалённых файлах
 */
const notifyRemoval = (
  window: BrowserWindow | null,
  animeId: string,
  fileNames: string[],
): void => {
  const payload: OfflineRemovalEvent = { animeId, fileNames };

  window?.webContents.send('offline-files-removed', payload);
  window?.webContents.send('offline-library-changed');
};

/**
 * Регистрирует обработчики оффлайн-режима
 */
export const registerOfflineHandlers = (
  getWindow: () => BrowserWindow | null,
): void => {
  offlineLibrary.init();
  downloadManager.attach(getWindow);
  downloadManager.restore();
  offlineLibrary.verify();
  offlineLibrary.cleanupOrphans(downloadManager.getReservedFiles());

  handleIpc('offline-get-snapshot', async () => buildSnapshot());

  handleIpc('offline-free-space', async () => offlineLibrary.getFreeSpace());

  handleIpc('offline-verify', async () => {
    const removed = offlineLibrary.verify();
    offlineLibrary.cleanupOrphans(downloadManager.getReservedFiles());

    if (removed > 0) {
      getWindow()?.webContents.send('offline-library-changed');
    }

    return removed;
  });

  handleIpc('offline-enqueue', async (event, requests: DownloadRequest[]) => {
    log.debug('Enqueue:', requests.length);
    return downloadManager.enqueue(requests);
  });

  handleIpc(
    'offline-resume',
    async (event, payload: { authToken: string; taskId?: string }) =>
      downloadManager.resume(payload.authToken, payload.taskId),
  );

  handleIpc('offline-cancel-task', async (event, taskId: string) => {
    downloadManager.cancel(taskId);
    return true;
  });

  handleIpc('offline-cancel-all', async () => downloadManager.cancelAll());

  handleIpc('offline-clear-finished', async () => {
    downloadManager.clearFinished();
    return true;
  });

  handleIpc(
    'offline-remove-episode',
    async (
      event,
      payload: {
        animeId: string;
        episodeId: number;
        playerId: number;
        quality: string;
      },
    ) => {
      const fileNames = offlineLibrary.removeEpisode(
        payload.animeId,
        payload.episodeId,
        payload.playerId,
        payload.quality,
      );
      notifyRemoval(getWindow(), payload.animeId, fileNames);
      return true;
    },
  );

  handleIpc('offline-remove-anime', async (event, animeId: string) => {
    const fileNames = offlineLibrary.removeAnime(animeId);
    notifyRemoval(getWindow(), animeId, fileNames);
    return true;
  });

  handleIpc(
    'offline-choose-directory',
    async (): Promise<OfflineDirectoryResult> => {
      const window = getWindow();
      const current = offlineLibrary.getDownloadsPath();

      const result = window
        ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
        : await dialog.showOpenDialog({ properties: ['openDirectory'] });

      const target = result.filePaths[0];

      if (result.canceled || !target || target === current) {
        return { path: current, status: 'unchanged', moved: 0, failed: 0 };
      }

      if (downloadManager.getReservedFiles().length > 0) {
        log.warn('Path change blocked: active downloads');
        return { path: current, status: 'busy', moved: 0, failed: 0 };
      }

      const outcome = await offlineLibrary.migrateTo(target, (moved, total) =>
        getWindow()?.webContents.send('offline-migration-progress', {
          moved,
          total,
        }),
      );

      getWindow()?.webContents.send('offline-library-changed');

      if (!outcome.fits) {
        return { path: current, status: 'no-space', moved: 0, failed: 0 };
      }

      return {
        path: offlineLibrary.getDownloadsPath(),
        status: outcome.failed > 0 ? 'failed' : 'migrated',
        moved: outcome.moved,
        failed: outcome.failed,
      };
    },
  );

  onIpc('offline-open-directory', () => {
    shell.openPath(offlineLibrary.getDownloadsPath());
  });

  handleIpc(
    'offline-check-connection',
    async () =>
      new Promise<boolean>((resolve) => {
        const request = https.get(CONNECTIVITY_PROBE_URL, (response) => {
          response.resume();
          resolve((response.statusCode || 500) < 500);
        });

        request.setTimeout(CONNECTIVITY_CHECK_TIMEOUT_MS, () => {
          request.destroy();
          resolve(false);
        });

        request.on('error', () => resolve(false));
        request.end();
      }),
  );

  log.debug('Handlers registered');
};
