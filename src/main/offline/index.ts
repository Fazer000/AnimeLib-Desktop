/* eslint-disable no-console */

/**
 * IPC обработчики оффлайн-библиотеки
 */
import https from 'https';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
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

  ipcMain.handle('offline-get-snapshot', async () => buildSnapshot());

  ipcMain.handle('offline-verify', async () => {
    const removed = offlineLibrary.verify();
    offlineLibrary.cleanupOrphans(downloadManager.getReservedFiles());

    if (removed > 0) {
      getWindow()?.webContents.send('offline-library-changed');
    }

    return removed;
  });

  ipcMain.handle(
    'offline-enqueue',
    async (event, requests: DownloadRequest[]) => {
      console.log('[Offline] Enqueue:', requests.length);
      return downloadManager.enqueue(requests);
    },
  );

  ipcMain.handle(
    'offline-resume',
    async (event, payload: { authToken: string; taskId?: string }) =>
      downloadManager.resume(payload.authToken, payload.taskId),
  );

  ipcMain.handle('offline-cancel-task', async (event, taskId: string) => {
    downloadManager.cancel(taskId);
    return true;
  });

  ipcMain.handle('offline-clear-finished', async () => {
    downloadManager.clearFinished();
    return true;
  });

  ipcMain.handle(
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

  ipcMain.handle('offline-remove-anime', async (event, animeId: string) => {
    const fileNames = offlineLibrary.removeAnime(animeId);
    notifyRemoval(getWindow(), animeId, fileNames);
    return true;
  });

  ipcMain.handle(
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
        console.warn('[Offline] Path change blocked: active downloads');
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

  ipcMain.on('offline-open-directory', () => {
    shell.openPath(offlineLibrary.getDownloadsPath());
  });

  ipcMain.handle(
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

  console.log('[Offline] Handlers registered');
};
