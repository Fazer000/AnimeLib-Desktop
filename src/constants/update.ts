/**
 * Константы механизма обновления приложения
 */

export const UPDATE_REPO_OWNER = 'Fazer000';

export const UPDATE_REPO_NAME = 'AnimeLib-Desktop';

export const UPDATE_REPO_URL = `https://github.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`;

export const UPDATE_LATEST_RELEASE_API = `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases/latest`;

export const UPDATE_RELEASES_PAGE = `${UPDATE_REPO_URL}/releases/latest`;

/** Начало имени установщика (exe, AppImage) */
export const UPDATE_ASSET_PREFIX = 'AnimeLib-Desktop-Setup';

/** Начало имени пакета deb и rpm */
export const UPDATE_PACKAGE_PREFIX = 'AnimeLib-Desktop';

/** Имя исполняемого файла на Linux: обёртка запуска рядом с бинарником */
export const UPDATE_LINUX_EXECUTABLE = 'animelib-desktop';

export const UPDATE_USER_AGENT = `${UPDATE_REPO_NAME}-Updater`;

export const UPDATE_CHECK_TIMEOUT_MS = 10000;

export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Пауза перед выходом: диалог успевает показать стадию, мс */
export const UPDATE_QUIT_DELAY_MS = 1000;

/** Сколько держится надпись «Скопировано» у команды установки, мс */
export const UPDATE_COPIED_RESET_MS = 2000;

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
 * Стадия после загрузки: установка пакета (deb, rpm) или перезапуск
 */
export type UpdateInstallStage = 'installing' | 'restarting';

/** Почему обновление не завершилось */
export type UpdateFailure = 'download' | 'install' | 'readonly';

/**
 * Результат загрузки и запуска установщика
 */
export interface UpdateResult {
  success: boolean;
  filePath?: string;
  error?: string;
  failure?: UpdateFailure;
  /** Команда для ручной установки deb или rpm в терминале */
  manualCommand?: string;
}
