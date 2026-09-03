import { createLogger } from '../../shared/logger';
import {
  DEFAULT_THEME_MODE,
  ThemeMode,
  normalizeThemeMode,
} from '../theme/themeMode';

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

/** Ставит наблюдателя за атрибутом темы, сообщая о смене через консоль страницы. */
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

    window.addEventListener('storage', function (event) {
      if (event.key === 'settings') report();
    });

    report();
    return true;
  } catch (e) {
    return false;
  }
})();
`;

/** Достаёт режим темы из сообщения гостевой страницы, чужие сообщения отбрасывает. */
export function parseSiteThemeMessage(message: unknown): ThemeMode | null {
  if (typeof message !== 'string') return null;
  if (!message.startsWith(SITE_THEME_MARKER)) return null;

  return normalizeThemeMode(message.slice(SITE_THEME_MARKER.length));
}

/** Однократно читает режим темы сайта из webview. */
export function readSiteTheme(webview: {
  executeJavaScript?: (code: string) => Promise<unknown>;
}): Promise<ThemeMode> {
  if (!webview?.executeJavaScript) return Promise.resolve(DEFAULT_THEME_MODE);

  return Promise.race([
    webview.executeJavaScript(siteThemeScript),
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('timeout')), READ_TIMEOUT_MS);
    }),
  ])
    .then((value) => normalizeThemeMode(value))
    .catch((error) => {
      log.warn('Не удалось прочитать тему сайта', error);

      return DEFAULT_THEME_MODE;
    });
}

/** Ставит наблюдателя за темой в гостевой странице. */
export function installSiteThemeWatcher(webview: {
  executeJavaScript?: (code: string) => Promise<unknown>;
}): Promise<boolean> {
  if (!webview?.executeJavaScript) return Promise.resolve(false);

  return webview
    .executeJavaScript(siteThemeWatcherScript)
    .then((value) => value === true)
    .catch((error) => {
      log.warn('Не удалось поставить наблюдателя темы', error);

      return false;
    });
}
