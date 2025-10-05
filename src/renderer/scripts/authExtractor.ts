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
  // Check if webview is ready
  if (!webview) {
    console.error('[AnimeLIB] Cannot extract token: webview is null');
    return Promise.reject(new Error('Webview is null'));
  }

  try {
    // Check if webview has executeJavaScript method
    if (!webview.executeJavaScript) {
      console.error(
        '[AnimeLIB] Webview does not have executeJavaScript method',
      );
      return Promise.reject(new Error('executeJavaScript not available'));
    }

    return webview
      .executeJavaScript(authExtractorScript)
      .then((result: any) => {
        console.log('[AnimeLIB] Extraction result:', result);

        if (result && result.success && result.token) {
          console.log('[AnimeLIB] ===== TOKEN EXTRACTED SUCCESSFULLY =====');
          console.log('[AnimeLIB] Token:', result.token);

          // Сохраняем токен
          try {
            localStorage.setItem(
              'animeLibAuthToken',
              JSON.stringify(result.token),
            );
            console.log('[AnimeLIB] Token saved to localStorage!');

            // Проверяем сохранение
            const saved = localStorage.getItem('animeLibAuthToken');
            if (saved) {
              console.log('[AnimeLIB] Verification: Token saved successfully!');
            } else {
              console.log('[AnimeLIB] Verification: FAILED to save token!');
            }
          } catch (err) {
            console.error('[AnimeLIB] Save error:', err);
          }
        } else {
          console.log('[AnimeLIB] ===== TOKEN EXTRACTION FAILED =====');
          console.log('[AnimeLIB] Error:', result?.error);
          console.log('[AnimeLIB] Available keys:', result?.keys);
        }
        return result;
      })
      .catch((err: any) => {
        console.error('[AnimeLIB] Script execution error:', err);
        throw err;
      });
  } catch (error) {
    console.error('[AnimeLIB] Error calling executeJavaScript:', error);
    return Promise.reject(error);
  }
}
