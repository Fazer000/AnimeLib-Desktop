/**
 * Упрощенный скрипт для перехвата кликов по кнопкам плеера
 */
export const clickInterceptorScript = `
  console.log('[AnimeLIB] ===== SIMPLE CLICK INTERCEPTOR =====');

  try {
    // Перехватчик кликов с проверкой на драг
    var isDragging = false;
    var dragStartTime = 0;
    var dragStartPosition = { x: 0, y: 0 };

    // Отслеживаем начало драга
    document.addEventListener('mousedown', function(e) {
      isDragging = false;
      dragStartTime = Date.now();
      dragStartPosition = { x: e.clientX, y: e.clientY };
    });

    // Отслеживаем движение мыши
    document.addEventListener('mousemove', function(e) {
      if (dragStartTime > 0) {
        var distance = Math.sqrt(
          Math.pow(e.clientX - dragStartPosition.x, 2) +
          Math.pow(e.clientY - dragStartPosition.y, 2)
        );

        // Если мышь переместилась больше чем на 5 пикселей, считаем это драгом
        if (distance > 5) {
          isDragging = true;
        }
      }
    });

    // Отслеживаем отпускание мыши
    document.addEventListener('mouseup', function() {
      // Сбрасываем состояние драга через небольшую задержку
      setTimeout(function() {
        isDragging = false;
        dragStartTime = 0;
      }, 100);
    });

    // Основной перехватчик кликов
    document.addEventListener('click', function(e) {
      console.log('[AnimeLIB] Click detected on:', e.target.tagName);
      console.log('[AnimeLIB] Is dragging:', isDragging);

      // Если это был драг, игнорируем клик
      if (isDragging) {
        console.log('[AnimeLIB] Ignoring click - was dragging');
        return;
      }

      // Проверяем сам элемент и его родителей
      var element = e.target;
      for (var i = 0; i < 10; i++) {
        if (!element) break;

        // Проверяем кнопки с текстом "Лицензирован"
        if (element.tagName === 'BUTTON') {
          var buttonText = element.textContent || element.innerText || '';
          console.log('[AnimeLIB] Button text:', buttonText);

          if (buttonText.trim() === 'Лицензирован') {
            console.log('[AnimeLIB] ===== LICENSED BUTTON CLICKED =====');
            console.log('[AnimeLIB] Current URL:', window.location.href);

            e.preventDefault();
            e.stopPropagation();

            // Отправляем событие через postMessage
            try {
              console.log('[AnimeLIB] Sending postMessage...');
              window.parent.postMessage({
                type: 'player-button-clicked',
                url: window.location.href
              }, '*');
              console.log('[AnimeLIB] PostMessage sent successfully');

              // Дополнительно пытаемся через изменение URL
              console.log('[AnimeLIB] Trying URL change method...');
              window.location.href = 'anime-lib-player://' + encodeURIComponent(window.location.href);
              console.log('[AnimeLIB] URL change attempted');
            } catch (error) {
              console.log('[AnimeLIB] PostMessage error:', error);
            }

            return false;
          }
        }

        // Проверяем ссылки
        if (element.tagName === 'A' && element.href) {
          var href = element.href;
          console.log('[AnimeLIB] Link found:', href);

          if (href.indexOf('/watch') !== -1 || href.indexOf('episode') !== -1) {
            console.log('[AnimeLIB] ===== PLAYER LINK CLICKED =====');
            console.log('[AnimeLIB] Player URL:', href);

            e.preventDefault();
            e.stopPropagation();

            // Отправляем событие через postMessage
            try {
              console.log('[AnimeLIB] Sending postMessage...');
              window.parent.postMessage({
                type: 'player-button-clicked',
                url: href
              }, '*');
              console.log('[AnimeLIB] PostMessage sent successfully');

              // Дополнительно пытаемся через изменение URL
              console.log('[AnimeLIB] Trying URL change method...');
              window.location.href = 'anime-lib-player://' + encodeURIComponent(href);
              console.log('[AnimeLIB] URL change attempted');
            } catch (error) {
              console.log('[AnimeLIB] PostMessage error:', error);
            }

            return false;
          }
        }

        // Проверяем data-атрибуты
        var dataUrl = element.getAttribute('data-url') || element.getAttribute('data-href');
        if (dataUrl && (dataUrl.indexOf('/watch') !== -1 || dataUrl.indexOf('episode') !== -1)) {
          console.log('[AnimeLIB] ===== PLAYER DATA CLICKED =====');
          console.log('[AnimeLIB] Player URL:', dataUrl);

          e.preventDefault();
          e.stopPropagation();

          try {
            console.log('[AnimeLIB] Sending postMessage for data...');
            window.parent.postMessage({
              type: 'player-button-clicked',
              url: dataUrl
            }, '*');
            console.log('[AnimeLIB] PostMessage sent successfully');
          } catch (error) {
            console.log('[AnimeLIB] PostMessage error:', error);
          }

          return false;
        }

        element = element.parentElement;
      }
    }, true);

    console.log('[AnimeLIB] Simple click interceptor ready');
  } catch (error) {
    console.error('[AnimeLIB] Click interceptor error:', error);
  }
`;

/**
 * Инжектирует скрипт перехвата кликов в WebView
 */
export function injectClickInterceptor(webview: any): Promise<void> {
  // Check if webview is ready
  if (!webview) {
    // eslint-disable-next-line no-console
    console.error('[AnimeLIB] Cannot inject script: webview is null');
    return Promise.reject(new Error('Webview is null'));
  }

  try {
    // Check if webview has executeJavaScript method
    if (!webview.executeJavaScript) {
      // eslint-disable-next-line no-console
      console.error(
        '[AnimeLIB] Webview does not have executeJavaScript method',
      );
      return Promise.reject(new Error('executeJavaScript not available'));
    }

    // Таймаут для executeJavaScript (5 секунд)
    const executeWithTimeout = Promise.race([
      webview.executeJavaScript(clickInterceptorScript),
      new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      }),
    ]);

    return executeWithTimeout
      .then(() => {
        // eslint-disable-next-line no-console
        console.log(
          '[AnimeLIB] Simple click interceptor injected successfully',
        );
        return undefined;
      })
      .catch((err: any) => {
        // Тихая обработка ошибок - не спамим консоль
        if (err.message !== 'Timeout') {
          // eslint-disable-next-line no-console
          console.warn(
            '[AnimeLIB] Click interceptor injection skipped:',
            err.message,
          );
        }
        // НЕ throw err - просто игнорируем ошибку
      });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[AnimeLIB] Error calling executeJavaScript:', error);
    return Promise.reject(error);
  }
}
