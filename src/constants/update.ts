/**
 * Константы механизма обновления приложения
 */

export const UPDATE_REPO_OWNER = 'Fazer000';

export const UPDATE_REPO_NAME = 'AnimeLib-Desktop';

export const UPDATE_REPO_URL = `https://github.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`;

export const UPDATE_LATEST_RELEASE_API = `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases/latest`;

export const UPDATE_RELEASES_PAGE = `${UPDATE_REPO_URL}/releases/latest`;

export const UPDATE_ASSET_PREFIX = 'AnimeLib-Desktop-Setup';

export const UPDATE_ASSET_SUFFIX = {
  win32: '.exe',
  darwin: '.dmg',
  linux: '.AppImage',
} as const;

export const UPDATE_USER_AGENT = `${UPDATE_REPO_NAME}-Updater`;

export const UPDATE_CHECK_TIMEOUT_MS = 10000;

export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Результат проверки доступной версии
 */
export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseUrl: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
}

/**
 * Результат загрузки и запуска установщика
 */
export interface UpdateResult {
  success: boolean;
  filePath?: string;
  error?: string;
}
