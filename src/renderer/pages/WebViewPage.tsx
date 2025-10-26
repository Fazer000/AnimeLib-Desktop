/* eslint-disable no-console */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box } from '@mui/material';
import CustomToolbar from '../components/Toolbar';
import { extractAuthToken, injectClickInterceptor } from '../scripts';
import { WebViewManager, ScriptInjectionManager } from '../services/webview';

interface WebViewProps {
  savedUrl: string;
  onPlayerButtonClick: (url: string, animeId?: string) => void;
}

/**
 * WebView - Refactored webview component with OOP architecture
 *
 * Uses:
 * - WebViewManager for navigation and URL management
 * - ScriptInjectionManager for script injection
 */
function WebViewRefactored({ savedUrl, onPlayerButtonClick }: WebViewProps) {
  const [currentUrl, setCurrentUrl] = useState(savedUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const webviewRef = useRef<any>(null);
  const webViewManagerRef = useRef<WebViewManager | null>(null);
  const scriptManagerRef = useRef<ScriptInjectionManager | null>(null);

  // ==================== Manager Initialization ====================

  /**
   * Initialize managers when webview is ready
   */
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      console.warn('[WebView] Webview ref not available yet');
      return undefined;
    }

    try {
      // Initialize WebViewManager
      const webViewManager = new WebViewManager(webview);
      webViewManagerRef.current = webViewManager;

      // Subscribe to navigation state changes
      webViewManager.subscribe({
        onNavigationStateChange: (back, forward) => {
          setCanGoBack(back);
          setCanGoForward(forward);
        },
        onUrlChange: (url) => {
          console.log('[WebView] URL changed:', url);
        },
        onLoadStop: (url) => {
          console.log('[WebView] Load complete:', url);
        },
        onError: (error) => {
          console.error('[WebView] Error occurred:', error);
        },
      });

      // Initialize ScriptInjectionManager
      const scriptManager = new ScriptInjectionManager(webview);
      scriptManagerRef.current = scriptManager;

      // Register script injection callbacks
      scriptManager.registerCallback(() => {
        console.log('[WebView] Injecting click interceptor...');
        try {
          injectClickInterceptor(webview).catch(() => {
            // Тихо игнорируем ошибку - она уже залогирована внутри функции
          });
        } catch (error) {
          console.error('[WebView] Error injecting click interceptor:', error);
        }
      });

      scriptManager.registerCallback(() => {
        console.log('[WebView] Extracting auth token...');
        try {
          extractAuthToken(webview).catch(() => {
            // Тихо игнорируем ошибку - она уже залогирована внутри функции
          });
        } catch (error) {
          console.error('[WebView] Error extracting auth token:', error);
        }
      });

      scriptManager.registerCallback(() => {
        console.log('[WebView] Injecting custom selects...');
        try {
          scriptManager.injectCustomSelects().catch(() => {
            // Тихо игнорируем ошибку - она уже залогирована внутри функции
          });
        } catch (error) {
          console.error('[WebView] Error injecting custom selects:', error);
        }
      });

      console.log('[WebView] Managers initialized successfully');

      // eslint-disable-next-line consistent-return
      return () => {
        console.log('[WebView] Cleaning up managers');
        try {
          webViewManager.detach();
          scriptManager.clearCallbacks();
        } catch (error) {
          console.error('[WebView] Error cleaning up managers:', error);
        }
      };
    } catch (error) {
      console.error('[WebView] Error initializing managers:', error);
      return undefined;
    }
  }, []);

  // ==================== WebView Event Handlers ====================

  /**
   * Setup webview event listeners
   */
  useEffect(() => {
    const webview = webviewRef.current;
    const webViewManager = webViewManagerRef.current;
    const scriptManager = scriptManagerRef.current;

    if (!webview || !webViewManager || !scriptManager) return;

    const handleDomReady = () => {
      console.log('[WebView] ===== DOM READY =====');
      // Now webview is ready, update navigation state
      webViewManager.updateNavigationState();
    };

    const handleLoadStop = () => {
      console.log('[WebView] ===== WEBVIEW LOAD STOP =====');
      console.log('[WebView] URL:', webview.src);

      webViewManager.handleLoadStop();
      scriptManager.inject();
    };

    const handleError = (e: any) => {
      console.error('[WebView] ===== WEBVIEW ERROR =====');
      console.error('[WebView] Error:', e);
      webViewManager.handleError(e);
    };

    const handleNavigate = (e: any) => {
      console.log('[WebView] ===== WEBVIEW NAVIGATION =====');
      console.log('[WebView] URL:', e.url);

      webViewManager.handleNavigation(e.url);
      scriptManager.inject();
    };

    const handleInPageNavigate = (e: any) => {
      console.log('[WebView] ===== WEBVIEW IN-PAGE NAVIGATION =====');
      console.log('[WebView] URL:', e.url);

      webViewManager.handleNavigation(e.url);
      scriptManager.inject();
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-finish-load', handleLoadStop);
    webview.addEventListener('did-fail-load', handleError);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleInPageNavigate);

    // eslint-disable-next-line consistent-return
    return () => {
      console.log('[WebView] Cleaning up event listeners and managers...');

      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-finish-load', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleError);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleInPageNavigate);

      // Очищаем ScriptInjectionManager
      if (scriptManager) {
        scriptManager.destroy();
      }

      console.log('[WebView] Cleanup complete');
    };
  }, []);

  /**
   * Check URL periodically
   */
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const checkUrlOnLoad = () => {
      if (webview && webview.executeJavaScript) {
        try {
          webview
            .executeJavaScript('window.location.href')
            .then((url: string) => {
              if (url && url !== localStorage.getItem('animeLibCurrentPage')) {
                console.log('[WebView] URL updated on load:', url);
                try {
                  localStorage.setItem('animeLibCurrentPage', url);
                } catch (error) {
                  console.error('[WebView] Error saving URL on load:', error);
                }
              }
              return null;
            })
            .catch((err: any) => {
              console.error('[WebView] Error getting URL on load:', err);
            });
        } catch {
          console.log('[WebView] WebView not ready for URL check on load');
        }
      }
    };

    checkUrlOnLoad();
    setTimeout(checkUrlOnLoad, 1000);
  }, []);

  /**
   * Update currentUrl when savedUrl changes
   */
  useEffect(() => {
    setCurrentUrl(savedUrl);
  }, [savedUrl]);

  /**
   * Listen for postMessage from webview
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only log auth-related messages
      if (event.data && event.data.type && event.data.type.includes('auth')) {
        console.log('[WebView] Auth-related message received:', event.data);
      }

      if (event.data && event.data.type === 'player-button-clicked') {
        console.log('[WebView] ===== PLAYER BUTTON CLICKED =====');
        console.log(
          '[WebView] Event data:',
          JSON.stringify(event.data, null, 2),
        );

        if (onPlayerButtonClick) {
          console.log(
            '[WebView] Calling onPlayerButtonClick:',
            event.data.url,
            event.data.animeId,
          );
          onPlayerButtonClick(event.data.url, event.data.animeId);
        } else {
          console.error('[WebView] onPlayerButtonClick is not defined!');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlayerButtonClick]);

  // ==================== Navigation Handlers ====================

  const handleGoBack = useCallback(() => {
    if (webViewManagerRef.current) {
      webViewManagerRef.current.goBack();
    }
  }, []);

  const handleGoForward = useCallback(() => {
    if (webViewManagerRef.current) {
      webViewManagerRef.current.goForward();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (webViewManagerRef.current) {
      webViewManagerRef.current.reload();
    }
  }, []);

  const handleHome = useCallback(() => {
    if (webViewManagerRef.current) {
      webViewManagerRef.current.navigateToHome();
    }
  }, []);

  const handleUrlChange = useCallback((newUrl: string) => {
    if (webViewManagerRef.current && newUrl.trim()) {
      webViewManagerRef.current.navigateTo(newUrl.trim());
      setCurrentUrl(newUrl.trim());
    }
  }, []);

  // ==================== Window Controls ====================

  const handleWindowMinimize = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.sendMessage('window-minimize');
    }
  }, []);

  const handleWindowMaximize = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.sendMessage('window-maximize');
    }
  }, []);

  const handleWindowClose = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.sendMessage('window-close');
    }
  }, []);

  // ==================== Render ====================

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CustomToolbar
        onBack={handleGoBack}
        onForward={handleGoForward}
        onRefresh={handleRefresh}
        onHome={handleHome}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        showUrlInput={showUrlInput}
        currentUrl={currentUrl}
        onUrlChange={handleUrlChange}
        onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
        onPlayerButtonClick={onPlayerButtonClick}
        onMinimize={handleWindowMinimize}
        onMaximize={handleWindowMaximize}
        onClose={handleWindowClose}
        backgroundColor="#252527"
        height={32}
      />

      {/* Padding for fixed toolbar */}
      <Box sx={{ flex: 1, position: 'relative', marginTop: '32px' }}>
        <webview
          ref={webviewRef}
          src={savedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            // Улучшения для качества рендера
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            imageRendering: 'crisp-edges',
          }}
          // eslint-disable-next-line react/no-unknown-property
          allowpopups
        />
      </Box>
    </Box>
  );
}

export default WebViewRefactored;
