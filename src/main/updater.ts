/**
 * Проверка обновлений через GitHub Releases и запуск установщика
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import { execFile, spawn } from 'child_process';
import { app, BrowserWindow, shell } from 'electron';
import {
  APP_VERSION,
  UPDATE_CHECK_TIMEOUT_MS,
  UPDATE_QUIT_DELAY_MS,
  UPDATE_LATEST_RELEASE_API,
  UPDATE_RELEASES_PAGE,
  UPDATE_REPO_URL,
  UPDATE_USER_AGENT,
  UpdateInfo,
  UpdateInstallStage,
  UpdateResult,
} from '../constants';

import { createLogger } from '../shared/logger';
import { isNewerVersion } from '../shared/version';
import {
  buildInstallCommand,
  buildManualInstallCommand,
  buildRelaunchCommand,
  getLinuxLauncherPath,
  getRelaunchArgs,
  pickAssetUrl,
  resolvePackageKind,
  UpdatePackageKind,
} from '../shared/updatePackage';
import { handleIpc, onIpc } from './ipc';

const log = createLogger('Updater');

/**
 * Вид установки: exe, AppImage, deb или rpm
 */
const getPackageKind = (): UpdatePackageKind => {
  let packageType: string | null = null;

  if (process.platform === 'linux' && !process.env.APPIMAGE) {
    try {
      packageType = fs.readFileSync(
        path.join(process.resourcesPath, 'package-type'),
        'utf8',
      );
    } catch {
      packageType = null;
    }
  }

  return resolvePackageKind(
    process.platform,
    process.env.APPIMAGE,
    packageType,
  );
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
    downloadUrl: pickAssetUrl(
      Array.isArray(release.assets) ? release.assets : [],
      getPackageKind(),
      latestVersion,
      UPDATE_REPO_URL,
    ),
    releaseUrl: release.html_url || UPDATE_RELEASES_PAGE,
    releaseName: String(release.name || `Версия ${latestVersion}`),
    releaseNotes: String(release.body || ''),
    publishedAt: String(release.published_at || ''),
  };
};

/**
 * Сообщает окну стадию после загрузки: установка или перезапуск
 */
const sendStage = (
  window: BrowserWindow | null,
  stage: UpdateInstallStage,
): void => {
  window?.webContents.send('update-install-stage', stage);
};

/** Перезапускает приложение после выхода текущего процесса */
const relaunchSoon = (execPath: string): void => {
  const relaunch = buildRelaunchCommand(
    execPath,
    getRelaunchArgs(process.argv),
    process.pid,
  );
  spawn(relaunch.command, relaunch.args, {
    detached: true,
    stdio: 'ignore',
  }).unref();
  setTimeout(() => app.quit(), UPDATE_QUIT_DELAY_MS);
};

/**
 * Выполняет команду; true — завершилась успешно
 */
const runCommand = (command: string, args: string[]): Promise<boolean> =>
  new Promise((resolve) => {
    execFile(command, args, (error, _stdout, stderr) => {
      if (error) log.warn('Install command failed:', error.message, stderr);
      resolve(!error);
    });
  });

/** AppImage: подменяет файл новым и перезапускает приложение */
const installAppImage = async (
  window: BrowserWindow | null,
  info: UpdateInfo,
  appImagePath: string,
): Promise<UpdateResult> => {
  const nextPath = path.join(
    path.dirname(appImagePath),
    `.${path.basename(appImagePath)}.update`,
  );
  const fallbackPath = path.join(
    app.getPath('downloads'),
    path.basename(new URL(info.downloadUrl).pathname),
  );
  const writable = await fs.promises
    .access(path.dirname(appImagePath), fs.constants.W_OK)
    .then(() => true)
    .catch(() => false);
  const target = writable ? nextPath : fallbackPath;

  const downloaded = await downloadFile(info.downloadUrl, target, (percent) =>
    window?.webContents.send('update-download-progress', percent),
  );
  if (!downloaded) {
    await fs.promises.rm(target, { force: true }).catch(() => undefined);
    return { success: false, failure: 'download' };
  }

  await fs.promises.chmod(target, 0o755).catch(() => undefined);

  const replaced =
    writable &&
    (await fs.promises
      .rename(target, appImagePath)
      .then(() => true)
      .catch((error) => {
        log.warn('AppImage replace failed:', error);
        return false;
      }));

  if (!replaced) {
    if (target === nextPath) {
      await fs.promises.copyFile(nextPath, fallbackPath);
      await fs.promises.chmod(fallbackPath, 0o755).catch(() => undefined);
      await fs.promises.rm(nextPath, { force: true }).catch(() => undefined);
    }
    shell.showItemInFolder(fallbackPath);
    return { success: false, failure: 'readonly', filePath: fallbackPath };
  }

  sendStage(window, 'restarting');
  relaunchSoon(appImagePath);
  return { success: true, filePath: appImagePath };
};

/**
 * deb и rpm: установка с паролем и перезапуск; при отказе — команда для терминала
 */
const installPackage = async (
  window: BrowserWindow | null,
  kind: UpdatePackageKind,
  filePath: string,
): Promise<UpdateResult> => {
  const managers = {
    dnf: fs.existsSync('/usr/bin/dnf'),
    zypper: fs.existsSync('/usr/bin/zypper'),
  };
  const command = buildInstallCommand(kind, filePath, managers);

  sendStage(window, 'installing');
  const installed = command
    ? await runCommand(command.command, command.args)
    : false;

  if (!installed) {
    shell.showItemInFolder(filePath);
    return {
      success: false,
      failure: 'install',
      filePath,
      manualCommand:
        buildManualInstallCommand(kind, filePath, managers) ?? undefined,
    };
  }

  sendStage(window, 'restarting');
  relaunchSoon(getLinuxLauncherPath(process.execPath));
  return { success: true, filePath };
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

  const kind = getPackageKind();
  const appImagePath = process.env.APPIMAGE;

  log.debug('Downloading:', info.downloadUrl, 'as', kind);

  if (kind === 'appimage' && appImagePath) {
    return installAppImage(window, info, appImagePath);
  }

  const fileName = path.basename(new URL(info.downloadUrl).pathname);
  const directory =
    kind === 'deb' || kind === 'rpm' ? app.getPath('downloads') : os.tmpdir();
  const filePath = path.join(directory, fileName);

  const downloaded = await downloadFile(info.downloadUrl, filePath, (percent) =>
    window?.webContents.send('update-download-progress', percent),
  );

  if (!downloaded) {
    await fs.promises.rm(filePath, { force: true }).catch(() => undefined);
    return {
      success: false,
      error: 'Не удалось скачать обновление',
      failure: 'download',
    };
  }

  log.debug('Downloaded to:', filePath);

  if (kind === 'deb' || kind === 'rpm') {
    return installPackage(window, kind, filePath);
  }

  if (process.platform === 'win32') {
    await shell.openPath(filePath);
    setTimeout(() => app.quit(), UPDATE_QUIT_DELAY_MS);
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
