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
 * Извлекает токен аутентификации из WebView
 */
export function extractAuthToken(webview: any): Promise<any> {
  if (!webview) {
    // eslint-disable-next-line no-console
    log.error('Cannot extract token: webview is null');
    return Promise.reject(new Error('Webview is null'));
  }

  try {
    if (!webview.executeJavaScript) {
      // eslint-disable-next-line no-console
      log.error('Webview does not have executeJavaScript method');
      return Promise.reject(new Error('executeJavaScript not available'));
    }

    const executeWithTimeout = Promise.race([
      webview.executeJavaScript(authExtractorScript),
      new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      }),
    ]);

    return executeWithTimeout
      .then((result: any) => {
        if (result && result.success && result.token) {
          try {
            localStorage.setItem(
              'animeLibAuthToken',
              JSON.stringify(result.token),
            );

            const saved = localStorage.getItem('animeLibAuthToken');
            if (!saved) {
              // eslint-disable-next-line no-console
              log.error('Verification: FAILED to save token!');
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            log.error('Save error:', err);
          }
        } else {
          // eslint-disable-next-line no-console
          log.debug('===== TOKEN EXTRACTION FAILED =====');
        }
        return result;
      })
      .catch((err: any) => {
        if (err.message !== 'Timeout') {
          // eslint-disable-next-line no-console
          log.warn('Auth extraction skipped:', err.message);
        }
      });
  } catch (error) {
    // eslint-disable-next-line no-console
    log.error('Error calling executeJavaScript:', error);
    return Promise.reject(error);
  }
}
