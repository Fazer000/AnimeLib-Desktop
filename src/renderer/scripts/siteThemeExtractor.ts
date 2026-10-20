import { createLogger } from '../../shared/logger';
import { ThemeMode, normalizeThemeMode } from '../theme/themeMode';

const log = createLogger('SiteTheme');

/** Префикс сообщения, которым гостевая страница сообщает о смене темы. */
export const SITE_THEME_MARKER = '[animelib-theme]';

const READ_TIMEOUT_MS = 3000;

/** Читает режим темы сайта: сначала атрибут корня, затем сохранённые настройки. */
export const siteThemeScript = `
(function () {
  try {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr) return attr;

    var raw = localStorage.getItem('settings');
    if (!raw) return '';

    var parsed = JSON.parse(raw);
    return (parsed && parsed.theme && parsed.theme.name) || '';
  } catch (e) {
    return '';
  }
})();
`;

/**
 * Ставит наблюдателя за атрибутом темы, сообщая о смене через консоль
 * страницы. О теме при загрузке не сообщает: тема общая для всех сайтов,
 * её задаёт приложение, а принимается только смена на самом сайте
 */
export const siteThemeWatcherScript = `
(function () {
  try {
    if (window.__animeLibThemeWatcher) return true;
    window.__animeLibThemeWatcher = true;

    var report = function () {
      var mode = document.documentElement.getAttribute('data-theme') || '';
      console.info('${SITE_THEME_MARKER}' + mode);
    };

    new MutationObserver(report).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return true;
  } catch (e) {
    return false;
  }
})();
`;

/** Имя темы в настройках сайта для режима приложения. */
export function toSiteThemeName(mode: ThemeMode): string {
  return mode === 'system' ? 'auto' : mode;
}

/**
 * Скрипт смены темы сайта: пишет тему в его настройки и сообщает о записи
 * событием storage, на которое сайт синхронизирует своё состояние
 */
export function buildSiteThemeWriteScript(mode: ThemeMode): string {
  const name = JSON.stringify(toSiteThemeName(mode));

  return `
(function () {
  try {
    var oldValue = localStorage.getItem('settings');
    var settings = oldValue ? JSON.parse(oldValue) : {};
    settings.theme = Object.assign({}, settings.theme, { name: ${name} });
    var newValue = JSON.stringify(settings);
    localStorage.setItem('settings', newValue);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'settings',
      oldValue: oldValue,
      newValue: newValue,
      storageArea: localStorage,
      url: location.href,
    }));
    return true;
  } catch (e) {
    return false;
  }
})();
`;
}

/** Достаёт режим темы из сообщения гостевой страницы, чужие сообщения отбрасывает. */
export function parseSiteThemeMessage(message: unknown): ThemeMode | null {
  if (typeof message !== 'string') return null;
  if (!message.startsWith(SITE_THEME_MARKER)) return null;

  return normalizeThemeMode(message.slice(SITE_THEME_MARKER.length));
}

/** Тег webview: его страница и id webContents для выполнения кода. */
export interface PageTarget {
  executeJavaScript?: (code: string) => Promise<unknown>;
  getWebContentsId?: () => number;
}

/**
 * Выполняет код в текущем документе webview. Через main-процесс код
 * выполняется сразу; executeJavaScript тега ждёт конца загрузки страницы,
 * и тема на тяжёлых сайтах применялась бы с опозданием или терялась
 */
async function runInPage(webview: PageTarget, code: string): Promise<unknown> {
  const invoke = window.electron?.ipcRenderer?.invoke;
  if (invoke && webview.getWebContentsId) {
    const result = await invoke('execute-in-page', {
      webContentsId: webview.getWebContentsId(),
      code,
    });
    if (!result.ok) throw new Error('page script failed');
    return result.value;
  }

  if (!webview.executeJavaScript) throw new Error('no page');
  return webview.executeJavaScript(code);
}

/** Однократно читает режим темы сайта; не удалось — null. */
export function readSiteTheme(webview: PageTarget): Promise<ThemeMode | null> {
  return Promise.race([
    runInPage(webview, siteThemeScript),
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('timeout')), READ_TIMEOUT_MS);
    }),
  ])
    .then((value) => normalizeThemeMode(value))
    .catch((error) => {
      log.warn('Не удалось прочитать тему сайта', error);

      return null;
    });
}

/** Ставит наблюдателя за темой в гостевой странице. */
export function installSiteThemeWatcher(webview: PageTarget): Promise<boolean> {
  return runInPage(webview, siteThemeWatcherScript)
    .then((value) => value === true)
    .catch((error) => {
      log.warn('Не удалось поставить наблюдателя темы', error);

      return false;
    });
}

/** Переключает тему сайта в webview. */
export function writeSiteTheme(
  webview: PageTarget,
  mode: ThemeMode,
): Promise<boolean> {
  return runInPage(webview, buildSiteThemeWriteScript(mode))
    .then((value) => value === true)
    .catch((error) => {
      log.warn('Не удалось сменить тему сайта', error);

      return false;
    });
}
