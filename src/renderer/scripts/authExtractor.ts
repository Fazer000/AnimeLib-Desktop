import { isSiteUrl } from '../utils/urlHelpers';
import { createLogger } from '../../shared/logger';

const log = createLogger('AnimeLIB');

/**
 * Скрипт для извлечения токена аутентификации из localStorage страницы
 */
export const authExtractorScript = `
  (function() {
    try {
      console.log('[AnimeLIB] Checking localStorage...');
      const authData = localStorage.getItem('auth');

      if (authData) {
        const parsed = JSON.parse(authData);
        console.log('[AnimeLIB] Found auth data, keys:', Object.keys(parsed));

        if (parsed.token) {
          console.log('[AnimeLIB] Token found!');
          return {
            success: true,
            token: parsed.token
          };
        } else {
          console.log('[AnimeLIB] No token in auth data');
          return {
            success: false,
            error: 'No token found',
            keys: Object.keys(parsed)
          };
        }
      } else {
        console.log('[AnimeLIB] No auth data in localStorage');
        return {
          success: false,
          error: 'No auth data',
          keys: Object.keys(localStorage)
        };
      }
    } catch (e) {
      console.error('[AnimeLIB] Error:', e);
      return {
        success: false,
        error: e.message
      };
    }
  })();
`;

/**
 * Итог попытки извлечения: сессия найдена, её нет, либо определить не удалось
 */
export type AuthExtractionOutcome = 'authenticated' | 'signed-out' | 'unknown';

const TOKEN_STORAGE_KEY = 'animeLibAuthToken';

/**
 * Проверяет, что гостевая страница действительно на сайте:
 * на сторонних страницах отсутствие сессии ничего не значит
 */
function isOnSitePage(webview: any): boolean {
  try {
    return isSiteUrl(webview.getURL());
  } catch {
    return false;
  }
}

/**
 * Извлекает токен аутентификации из WebView и синхронизирует его копию.
 * Копия удаляется, когда сайт сообщил об отсутствии сессии.
 */
export function extractAuthToken(webview: any): Promise<AuthExtractionOutcome> {
  if (!webview?.executeJavaScript) {
    log.error('Cannot extract token: webview is not ready');
    return Promise.resolve('unknown');
  }

  const withTimeout = Promise.race([
    webview.executeJavaScript(authExtractorScript),
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 5000);
    }),
  ]);

  return withTimeout
    .then((result: any): AuthExtractionOutcome => {
      if (result?.success && result.token) {
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(result.token));
        } catch (error) {
          log.error('Save error:', error);
        }

        return 'authenticated';
      }

      if (!result || !isOnSitePage(webview)) {
        return 'unknown';
      }

      log.debug('No session on site, clearing stored token');

      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch (error) {
        log.error('Clear error:', error);
      }

      return 'signed-out';
    })
    .catch((error: any): AuthExtractionOutcome => {
      if (error?.message !== 'Timeout') {
        log.warn('Auth extraction skipped:', error?.message);
      }
      return 'unknown';
    });
}
