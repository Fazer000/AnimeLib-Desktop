import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
} from 'react';
import { Box } from '@mui/material';
import CustomToolbar from '../components/Toolbar';
import useStableSize from '../hooks/useStableSize';
import { extractAuthToken, injectClickInterceptor } from '../scripts';
import {
  WebViewManager,
  ScriptInjectionManager,
  playerHistoryManager,
} from '../services/webview';
import { PLAYER_PROTOCOL_PREFIX } from '../../constants';

import { createLogger } from '../../shared/logger';
import { SURFACE_HEADER } from '../theme/palette';

const log = createLogger('WebView');

export interface WebViewPageRef {
  navigateTo: (url: string) => void;
  goHome: () => void;
  goBack: () => void;
  getCurrentUrl: () => string;
}

interface WebViewProps {
  savedUrl: string;
  onPlayerButtonClick: (url: string, animeId?: string) => void;
  // eslint-disable-next-line react/require-default-props
  hidden?: boolean;
  // eslint-disable-next-line react/require-default-props
  pageRef?: React.Ref<WebViewPageRef>;
  // eslint-disable-next-line react/require-default-props
  onBeforeGoBack?: () => boolean;
}

/**
 * WebView - Refactored webview component with OOP architecture
 *
 * Uses:
 * - WebViewManager for navigation and URL management
 * - ScriptInjectionManager for script injection
 */
function WebViewRefactored({
  savedUrl,
  onPlayerButtonClick,
  hidden = false,
  pageRef,
  onBeforeGoBack,
}: WebViewProps) {
  const [currentUrl, setCurrentUrl] = useState(savedUrl);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const webviewRef = useRef<any>(null);
  const webViewManagerRef = useRef<WebViewManager | null>(null);
  const scriptManagerRef = useRef<ScriptInjectionManager | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hostSize = useStableSize(hostRef);

  /**
   * Initialize managers when webview is ready
   */
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) {
      log.warn('Webview ref not available yet');
      return undefined;
    }

    try {
      const webViewManager = new WebViewManager(webview);
      webViewManagerRef.current = webViewManager;

      webViewManager.subscribe({
        onNavigationStateChange: (back) => {
          setCanGoBack(back);
        },
        onUrlChange: (url) => {
          log.debug('URL changed:', url);
        },
        onLoadStop: (url) => {
          log.debug('Load complete:', url);
        },
        onError: (error) => {
          log.error('Error occurred:', error);
        },
      });

      const scriptManager = new ScriptInjectionManager(webview);
      scriptManagerRef.current = scriptManager;

      scriptManager.registerCallback(() => {
        log.debug('Injecting click interceptor...');
        try {
          injectClickInterceptor(webview).catch(() => {});
        } catch (error) {
          log.error('Error injecting click interceptor:', error);
        }
      });

      scriptManager.registerCallback(() => {
        log.debug('Extracting auth token...');
        try {
          extractAuthToken(webview).catch(() => {});
        } catch (error) {
          log.error('Error extracting auth token:', error);
        }
      });

      scriptManager.registerCallback(() => {
        log.debug('Injecting custom selects...');
        try {
          scriptManager.injectCustomSelects().catch(() => {});
        } catch (error) {
          log.error('Error injecting custom selects:', error);
        }
      });

      log.debug('Managers initialized successfully');

      // eslint-disable-next-line consistent-return
      return () => {
        log.debug('Cleaning up managers');
        try {
          webViewManager.detach();
          scriptManager.clearCallbacks();
        } catch (error) {
          log.error('Error cleaning up managers:', error);
        }
      };
    } catch (error) {
      log.error('Error initializing managers:', error);
      return undefined;
    }
  }, []);

  /**
   * Setup webview event listeners
   */
  useEffect(() => {
    const webview = webviewRef.current;
    const webViewManager = webViewManagerRef.current;
    const scriptManager = scriptManagerRef.current;

    if (!webview || !webViewManager || !scriptManager) return;

    const handleDomReady = () => {
      log.debug('===== DOM READY =====');
      webViewManager.updateNavigationState();
    };

    const handleLoadStop = () => {
      log.debug('===== WEBVIEW LOAD STOP =====');
      log.debug('URL:', webview.src);

      webViewManager.handleLoadStop();
      scriptManager.inject();
    };

    const handleError = (e: any) => {
      const failedUrl = String(e?.validatedURL || '');
      if (failedUrl.startsWith(PLAYER_PROTOCOL_PREFIX)) {
        log.debug('Player protocol navigation ignored');
        return;
      }

      log.error('===== WEBVIEW ERROR =====');
      log.error('Error:', e);
      webViewManager.handleError(e);
    };

    const handleNavigate = (e: any) => {
      log.debug('===== WEBVIEW NAVIGATION =====');
      log.debug('URL:', e.url);

      webViewManager.handleNavigation(e.url);
      scriptManager.inject();
    };

    const handleInPageNavigate = (e: any) => {
      log.debug('===== WEBVIEW IN-PAGE NAVIGATION =====');
      log.debug('URL:', e.url);

      webViewManager.handleNavigation(e.url, 'in-page');
      scriptManager.inject();
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-finish-load', handleLoadStop);
    webview.addEventListener('did-fail-load', handleError);
    webview.addEventListener('did-navigate', handleNavigate);
    webview.addEventListener('did-navigate-in-page', handleInPageNavigate);

    // eslint-disable-next-line consistent-return
    return () => {
      log.debug('Cleaning up event listeners and managers...');

      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-finish-load', handleLoadStop);
      webview.removeEventListener('did-fail-load', handleError);
      webview.removeEventListener('did-navigate', handleNavigate);
      webview.removeEventListener('did-navigate-in-page', handleInPageNavigate);

      if (scriptManager) {
        scriptManager.destroy();
      }

      log.debug('Cleanup complete');
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
                log.debug('URL updated on load:', url);
                try {
                  localStorage.setItem('animeLibCurrentPage', url);
                } catch (error) {
                  log.error('Error saving URL on load:', error);
                }
              }
              return null;
            })
            .catch((err: any) => {
              log.error('Error getting URL on load:', err);
            });
        } catch {
          log.debug('WebView not ready for URL check on load');
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
      if (event.data && event.data.type && event.data.type.includes('auth')) {
        log.debug('Auth-related message received:', event.data);
      }

      if (event.data && event.data.type === 'player-button-clicked') {
        log.debug('===== PLAYER BUTTON CLICKED =====');
        log.debug('Event data:', JSON.stringify(event.data, null, 2));

        if (onPlayerButtonClick) {
          log.debug(
            'Calling onPlayerButtonClick:',
            event.data.url,
            event.data.animeId,
          );
          onPlayerButtonClick(event.data.url, event.data.animeId);
        } else {
          log.error('onPlayerButtonClick is not defined!');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onPlayerButtonClick]);

  const handleGoBack = useCallback(() => {
    if (onBeforeGoBack?.()) {
      return;
    }

    webViewManagerRef.current?.goBack();
  }, [onBeforeGoBack]);

  const handleRefresh = useCallback(() => {
    if (webViewManagerRef.current) {
      webViewManagerRef.current.reload();
    }
  }, []);

  const handleHome = useCallback(() => {
    playerHistoryManager.clear();
    webViewManagerRef.current?.navigateToHome();
  }, []);

  useImperativeHandle(
    pageRef,
    () => ({
      navigateTo: (url: string) => {
        webViewManagerRef.current?.navigateTo(url);
        setCurrentUrl(url);
      },
      goHome: handleHome,
      goBack: () => {
        webViewManagerRef.current?.goBack();
      },
      getCurrentUrl: () => webViewManagerRef.current?.getTrackedUrl() ?? '',
    }),
    [handleHome],
  );

  useEffect(() => {
    webViewManagerRef.current?.setAudioMuted(hidden);

    if (!hidden) {
      webViewManagerRef.current?.updateNavigationState();
    }
  }, [hidden]);

  const handleUrlChange = useCallback((newUrl: string) => {
    if (webViewManagerRef.current && newUrl.trim()) {
      webViewManagerRef.current.navigateTo(newUrl.trim());
      setCurrentUrl(newUrl.trim());
    }
  }, []);

  const handleWindowMinimize = useCallback(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.sendMessage('window-minimize');
    }
  }, []);

  const handleWindowMaximize = useCallback(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.sendMessage('window-maximize');
    }
  }, []);

  const handleWindowClose = useCallback(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.sendMessage('window-close');
    }
  }, []);

  // @ts-ignore
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CustomToolbar
        onBack={handleGoBack}
        onRefresh={handleRefresh}
        onHome={handleHome}
        canGoBack={canGoBack}
        showUrlInput={showUrlInput}
        currentUrl={currentUrl}
        onUrlChange={handleUrlChange}
        onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
        onPlayerButtonClick={onPlayerButtonClick}
        onMinimize={handleWindowMinimize}
        onMaximize={handleWindowMaximize}
        onClose={handleWindowClose}
        backgroundColor={SURFACE_HEADER}
        height={32}
      />

      <Box
        ref={hostRef}
        sx={{
          flex: 1,
          position: 'relative',
          marginTop: '32px',
          overflow: 'hidden',
        }}
      >
        <webview
          ref={webviewRef}
          src={savedUrl}
          style={{
            width: hostSize ? `${hostSize.width}px` : '100%',
            height: hostSize ? `${hostSize.height}px` : '100%',
            border: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        />
      </Box>
    </Box>
  );
}

export default WebViewRefactored;
