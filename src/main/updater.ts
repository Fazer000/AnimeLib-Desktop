/**
 * Проверка обновлений через GitHub Releases и запуск установщика
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import { app, BrowserWindow, shell } from 'electron';
import {
  APP_VERSION,
  UPDATE_ASSET_PREFIX,
  UPDATE_ASSET_SUFFIX,
  UPDATE_CHECK_TIMEOUT_MS,
  UPDATE_LATEST_RELEASE_API,
  UPDATE_RELEASES_PAGE,
  UPDATE_REPO_URL,
  UPDATE_USER_AGENT,
  UpdateInfo,
  UpdateResult,
} from '../constants';

import { createLogger } from '../shared/logger';
import { isNewerVersion } from '../shared/version';
import { handleIpc, onIpc } from './ipc';

const log = createLogger('Updater');

/**
 * Возвращает расширение установщика для текущей платформы
 */
const getPlatformSuffix = (): string => {
  const suffixes = UPDATE_ASSET_SUFFIX as Record<string, string>;
  return suffixes[process.platform] || UPDATE_ASSET_SUFFIX.win32;
};

/**
 * Запрашивает JSON с поддержкой редиректов
 */
const requestJson = (url: string, redirects = 3): Promise<any | null> =>
  new Promise((resolve) => {
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': UPDATE_USER_AGENT,
          Accept: 'application/vnd.github+json',
        },
      },
      (response) => {
        const { statusCode, headers } = response;

        if (
          statusCode &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location &&
          redirects > 0
        ) {
          response.resume();
          resolve(
            requestJson(new URL(headers.location, url).href, redirects - 1),
          );
          return;
        }

        if (!statusCode || statusCode >= 400) {
          response.resume();
          resolve(null);
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            resolve(null);
          }
        });
      },
    );

    request.setTimeout(UPDATE_CHECK_TIMEOUT_MS, () => request.destroy());
    request.on('error', () => resolve(null));
    request.end();
  });

/**
 * Скачивает файл с отчетом о прогрессе
 */
const downloadFile = (
  url: string,
  destination: string,
  onProgress: (percent: number) => void,
  redirects = 5,
): Promise<boolean> =>
  new Promise((resolve) => {
    const request = https.get(
      url,
      { headers: { 'User-Agent': UPDATE_USER_AGENT } },
      (response) => {
        const { statusCode, headers } = response;

        if (
          statusCode &&
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location &&
          redirects > 0
        ) {
          response.resume();
          resolve(
            downloadFile(
              new URL(headers.location, url).href,
              destination,
              onProgress,
              redirects - 1,
            ),
          );
          return;
        }

        if (!statusCode || statusCode >= 400) {
          response.resume();
          resolve(false);
          return;
        }

        const total = Number(headers['content-length']) || 0;
        const file = fs.createWriteStream(destination);
        let loaded = 0;

        response.on('data', (chunk: Buffer) => {
          loaded += chunk.length;
          if (total > 0) {
            onProgress(Math.round((loaded / total) * 100));
          }
        });

        response.pipe(file);
        file.on('finish', () => file.close(() => resolve(true)));
        file.on('error', () => resolve(false));
      },
    );

    request.on('error', () => resolve(false));
    request.end();
  });

/**
 * Строит ссылку на установщик по шаблону имени артефакта
 */
const buildFallbackDownloadUrl = (version: string): string =>
  `${UPDATE_REPO_URL}/releases/download/v${version}/${UPDATE_ASSET_PREFIX}-${version}${getPlatformSuffix()}`;

/**
 * Выбирает подходящий файл релиза для текущей платформы
 */
const pickAssetUrl = (release: any, version: string): string => {
  const suffix = getPlatformSuffix();
  const assets: any[] = Array.isArray(release?.assets) ? release.assets : [];
  const asset = assets.find((item) =>
    String(item?.name || '').endsWith(suffix),
  );

  return asset?.browser_download_url || buildFallbackDownloadUrl(version);
};

/**
 * Проверяет наличие новой версии на GitHub
 */
export const checkForUpdate = async (): Promise<UpdateInfo> => {
  const base: UpdateInfo = {
    available: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    downloadUrl: '',
    releaseUrl: UPDATE_RELEASES_PAGE,
    releaseName: '',
    releaseNotes: '',
    publishedAt: '',
  };

  const release = await requestJson(UPDATE_LATEST_RELEASE_API);

  if (!release?.tag_name) {
    log.debug('Release info unavailable');
    return base;
  }

  const latestVersion = String(release.tag_name).replace(/^v/i, '');

  if (!isNewerVersion(latestVersion, APP_VERSION)) {
    return { ...base, latestVersion };
  }

  return {
    available: true,
    currentVersion: APP_VERSION,
    latestVersion,
    downloadUrl: pickAssetUrl(release, latestVersion),
    releaseUrl: release.html_url || UPDATE_RELEASES_PAGE,
    releaseName: String(release.name || `Версия ${latestVersion}`),
    releaseNotes: String(release.body || ''),
    publishedAt: String(release.published_at || ''),
  };
};

/**
 * Скачивает установщик и запускает его
 */
const downloadAndInstall = async (
  window: BrowserWindow | null,
  info: UpdateInfo,
): Promise<UpdateResult> => {
  if (!info.downloadUrl) {
    return { success: false, error: 'Файл обновления не найден' };
  }

  const fileName = path.basename(new URL(info.downloadUrl).pathname);
  const filePath = path.join(os.tmpdir(), fileName);

  log.debug('Downloading:', info.downloadUrl);

  const downloaded = await downloadFile(info.downloadUrl, filePath, (percent) =>
    window?.webContents.send('update-download-progress', percent),
  );

  if (!downloaded) {
    await fs.promises.rm(filePath, { force: true }).catch(() => undefined);
    return { success: false, error: 'Не удалось скачать обновление' };
  }

  log.debug('Downloaded to:', filePath);

  if (process.platform === 'win32') {
    await shell.openPath(filePath);
    setTimeout(() => app.quit(), 1000);
  } else {
    shell.showItemInFolder(filePath);
  }

  return { success: true, filePath };
};

/**
 * Регистрирует IPC обработчики обновления
 */
export const registerUpdateHandlers = (
  getWindow: () => BrowserWindow | null,
): void => {
  handleIpc('check-for-update', async () => {
    const info = await checkForUpdate();
    log.debug(
      `Current: ${info.currentVersion}, latest: ${info.latestVersion}, available: ${info.available}`,
    );
    return info;
  });

  handleIpc('download-update', async () => {
    const info = await checkForUpdate();

    if (!info.available) {
      return { success: false, error: 'Обновление не требуется' };
    }

    return downloadAndInstall(getWindow(), info);
  });

  onIpc('open-release-page', () => {
    shell.openExternal(UPDATE_RELEASES_PAGE);
  });

  log.debug('Update handlers registered');
};
