import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import UrlInputPage from './pages/UrlInputPage';
import WebView from './pages/WebViewPage';
import type { WebViewPageRef } from './pages/WebViewPage';
import PlayerPage from './pages/PlayerPage';
import { buildAnimePageUrl, saveSiteUrl } from './utils/urlHelpers';
import ContinueWatchingButton from './components/ContinueWatchingButton';
import OfflineButton from './components/offline/OfflineButton';
import {
  NavigationHistoryTracker,
  playerHistoryManager,
} from './services/webview';
import OfflineNoticeDialog from './components/offline/OfflineNoticeDialog';
import useWatchingBookmarks from './hooks/useWatchingBookmarks';
import useOnlineStatus from './hooks/useOnlineStatus';
import useProgressSync from './hooks/useProgressSync';
import useOfflineLibrary from './hooks/useOfflineLibrary';
import { offlineCatalog } from './services/offline';
import { checkConnection } from './utils/connectivity';

import { createLogger } from '../shared/logger';

const log = createLogger('App');

declare module '@mui/material/styles' {
  interface CustomColors {
    dtPrimaryColor: string;
    dtSecondaryColor: string;
    dtBlueColor: string;
    dtAlphaPrimaryColor: string;
    dtBorderColor: string;
    dtAlphaBorderColor: string;
    dtLineColor: string;
    dtHeaderColor: string;
    dtPrimaryTextColor: string;
    dtSecondaryTextColor: string;
    dtAccentTextColor: string;

    ltPrimaryColor: string;
    ltSecondaryColor: string;
    ltBlueColor: string;
    ltAlphaPrimaryColor: string;
    ltBorderColor: string;
    ltAlphaBorderColor: string;
    ltLineColor: string;
    ltHeaderColor: string;
    ltPrimaryTextColor: string;
    ltSecondaryTextColor: string;
    ltAccentTextColor: string;

    whiteColor: string;
    grayColor: string;
    blackColor: string;
    bookmarkColor: string;
  }

  interface Palette {
    customColors: CustomColors;
  }

  interface PaletteOptions {
    customColors?: CustomColors;
  }
}

const darkTheme = createTheme({
  typography: {
    fontFamily: '"Open Sans", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#1c1c1c',
      light: '#2d2d2d',
      dark: '#0a0a0a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7C3AED',
      light: '#9F67FF',
      dark: '#5B21B6',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1c1c1c',
      paper: '#252527',
    },
    text: {
      primary: '#bfbfbf',
      secondary: '#7C3AED',
      disabled: 'rgba(191, 191, 191, 0.5)',
    },
    divider: '#464649',
    customColors: {
      dtPrimaryColor: '#1c1c1c',
      dtSecondaryColor: '#7C3AED',
      dtBlueColor: '#2196f3',
      dtAlphaPrimaryColor: 'rgba(0, 0, 0, 0.19)',
      dtBorderColor: '#464649',
      dtAlphaBorderColor: 'rgba(84, 84, 88, 0.44)',
      dtLineColor: '#464649',
      dtHeaderColor: '#252527',
      dtPrimaryTextColor: '#bfbfbf',
      dtSecondaryTextColor: '#7C3AED',
      dtAccentTextColor: 'rgba(245, 245, 250, 0.5)',

      ltPrimaryColor: '#FFFFFF',
      ltSecondaryColor: '#7C3AED',
      ltBlueColor: '#1976D2',
      ltAlphaPrimaryColor: 'rgba(255, 255, 255, 0.10)',
      ltBorderColor: '#E0E0E0',
      ltAlphaBorderColor: 'rgba(224, 224, 224, 0.2)',
      ltLineColor: '#AAAAAA',
      ltHeaderColor: '#ede7f6',
      ltPrimaryTextColor: '#212121',
      ltSecondaryTextColor: '#7C3AED',
      ltAccentTextColor: '#757575',

      whiteColor: '#FFFFFF',
      grayColor: '#D8D8D8',
      blackColor: '#000000',
      bookmarkColor: '#ff9b40',
    },
  },
  components: {
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '32px !important',
          height: '32px !important',
          paddingLeft: '8px !important',
          paddingRight: '8px !important',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#252527 !important',
          boxShadow: 'none !important',
          border: 'none !important',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [animeId, setAnimeId] = useState<string | null>(null);
  const bookmarks = useWatchingBookmarks(playerUrl);
  const isOnline = useOnlineStatus();
  const offlineSnapshot = useOfflineLibrary();

  const [offlineTarget, setOfflineTarget] = useState<{
    animeId: string;
    episodeId?: number;
  } | null>(null);
  const [libraryTab, setLibraryTab] = useState<number | null>(null);
  const [showOfflineNotice, setShowOfflineNotice] = useState<boolean>(false);

  const hasDownloads = offlineSnapshot.anime.length > 0;

  const offlineContinue = useMemo(
    () => offlineCatalog.getContinueItems(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offlineSnapshot, offlineTarget, isOnline],
  );

  useProgressSync(isOnline);

  useEffect(() => {
    log.debug('Connection status:', isOnline ? 'online' : 'offline');
  }, [isOnline]);

  useEffect(() => {
    setShowOfflineNotice(!isOnline && hasDownloads);
  }, [isOnline, hasDownloads]);

  const webViewRef = useRef<WebViewPageRef>(null);
  const [playerReturnsBack, setPlayerReturnsBack] = useState<boolean>(false);
  const [playerEpisodeId, setPlayerEpisodeId] = useState<number | undefined>(
    undefined,
  );
  useEffect(() => {
    NavigationHistoryTracker.install();
  }, []);

  const handlePlayerButtonClick = useCallback(
    (url: string, providedAnimeId?: string, episodeId?: number) => {
      log.debug('[AnimeLIB] Opening player page for URL:', url);
      log.debug('[AnimeLIB] Provided anime ID:', providedAnimeId);

      let finalAnimeId = providedAnimeId;
      if (!finalAnimeId) {
        const animeIdMatch = url.match(/\/anime\/([^/?]+)/);
        if (animeIdMatch) {
          [, finalAnimeId] = animeIdMatch;
        } else {
          const savedPageUrl = localStorage.getItem('animeLibCurrentPage');
          if (savedPageUrl) {
            const savedAnimeIdMatch = savedPageUrl.match(/\/anime\/([^/?]+)/);
            finalAnimeId = savedAnimeIdMatch ? savedAnimeIdMatch[1] : 'unknown';
            log.debug(
              '[AnimeLIB] Using anime ID from saved page:',
              finalAnimeId,
            );
          } else {
            finalAnimeId = 'unknown';
          }
        }
      }

      log.debug('[AnimeLIB] Final anime ID:', finalAnimeId);
      playerHistoryManager.open(
        url,
        finalAnimeId ?? 'unknown',
        webViewRef.current?.getCurrentUrl() ?? '',
      );
      NavigationHistoryTracker.record({ source: 'player-open', url });
      setPlayerReturnsBack(false);
      setPlayerEpisodeId(episodeId);
      setPlayerUrl(url);
      setAnimeId(finalAnimeId);
    },
    [],
  );

  useEffect(() => {
    const storedUrl = localStorage.getItem('animeLibUrl');
    if (storedUrl) {
      setSavedUrl(storedUrl);
    }

    if (window.electron?.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on(
        'open-player-page',
        (...args: unknown[]) => {
          const url = args[0] as string;
          log.debug('[AnimeLIB] Received player page request:', url);
          handlePlayerButtonClick(url);
        },
      );

      return unsubscribe;
    }

    return undefined;
  }, [handlePlayerButtonClick]);

  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on(
        'player-button-clicked',
        (...args: unknown[]) => {
          const url = args[0] as string;
          log.debug('[AnimeLIB] Received player button click via IPC:', url);
          handlePlayerButtonClick(url);
        },
      );

      return unsubscribe;
    }

    return undefined;
  }, [handlePlayerButtonClick]);

  const handleUrlSubmit = useCallback((url: string) => {
    setSavedUrl(saveSiteUrl(url));
  }, []);

  const handlePlayFromLibrary = useCallback(
    async (id: string, episodeId?: number) => {
      if (await checkConnection()) {
        log.debug('Opening online player from library:', id, episodeId);
        setOfflineTarget(null);
        handlePlayerButtonClick(buildAnimePageUrl(id), id, episodeId);
        return;
      }

      log.debug('Opening offline player:', id, episodeId);

      if (playerUrl) {
        playerHistoryManager.discard();
        setPlayerUrl(null);
        setAnimeId(null);
        setPlayerReturnsBack(false);
      }

      setOfflineTarget({ animeId: id, episodeId });
    },
    [playerUrl, handlePlayerButtonClick],
  );

  const handlePlayerClose = useCallback((url: string) => {
    NavigationHistoryTracker.record({ source: 'player-close', url });
    setPlayerUrl(null);
    setAnimeId(null);
    setPlayerEpisodeId(undefined);
    setPlayerReturnsBack(false);
  }, []);

  const handleBeforeGoBack = useCallback(() => {
    const currentUrl = webViewRef.current?.getCurrentUrl() ?? '';
    const entry = playerHistoryManager.takeEntryFor(currentUrl);

    if (!entry) {
      return false;
    }

    NavigationHistoryTracker.record({
      source: 'player-open',
      url: entry.playerUrl,
    });
    setPlayerReturnsBack(true);
    setPlayerUrl(entry.playerUrl);
    setAnimeId(entry.animeId);

    return true;
  }, []);

  if (!savedUrl) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <UrlInputPage onSubmit={handleUrlSubmit} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            visibility: playerUrl || offlineTarget ? 'hidden' : 'visible',
            pointerEvents: playerUrl || offlineTarget ? 'none' : 'auto',
          }}
        >
          <WebView
            pageRef={webViewRef}
            savedUrl={savedUrl}
            hidden={Boolean(playerUrl)}
            onBeforeGoBack={handleBeforeGoBack}
            onPlayerButtonClick={handlePlayerButtonClick}
          />
          {!playerUrl && !offlineTarget && (
            <>
              <ContinueWatchingButton
                bookmarks={bookmarks}
                useOffline={!isOnline}
                offlineItems={offlineContinue}
                onSelectOffline={(item) => {
                  log.debug('Continue watching offline:', item.animeId);
                  handlePlayFromLibrary(item.animeId, item.episodeId);
                }}
                onSelect={(bookmark) => {
                  const url = buildAnimePageUrl(bookmark.animeSlugUrl);
                  log.debug('Continue watching:', url);
                  handlePlayerButtonClick(url, bookmark.animeSlugUrl);
                }}
              />
              <OfflineButton
                onPlayOffline={handlePlayFromLibrary}
                openTab={libraryTab}
                onOpenHandled={() => setLibraryTab(null)}
              />
            </>
          )}
        </Box>

        <OfflineNoticeDialog
          open={showOfflineNotice && !playerUrl && !offlineTarget}
          onOpenLibrary={() => {
            setShowOfflineNotice(false);
            setLibraryTab(2);
          }}
          onClose={() => setShowOfflineNotice(false)}
        />

        {offlineTarget && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            <PlayerPage
              key={`offline-${offlineTarget.animeId}-${offlineTarget.episodeId ?? 'auto'}`}
              playerUrl=""
              animeId={offlineTarget.animeId}
              offlineMode
              initialEpisodeId={offlineTarget.episodeId}
              onPlayOffline={handlePlayFromLibrary}
              onBack={() => {
                log.debug('Offline player closed');
                setOfflineTarget(null);
              }}
              onHome={() => {
                log.debug('Offline player home');
                webViewRef.current?.goHome();
                setOfflineTarget(null);
              }}
              onNavigateToUrl={(url: string) => {
                log.debug('Offline player navigate to URL:', url);
                webViewRef.current?.navigateTo(url);
                setOfflineTarget(null);
              }}
              onPlayerButtonClick={(url: string, providedAnimeId?: string) => {
                setOfflineTarget(null);
                handlePlayerButtonClick(url, providedAnimeId);
              }}
            />
          </Box>
        )}

        {playerUrl && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <PlayerPage
              key={`${animeId || 'unknown'}-${playerEpisodeId ?? 'auto'}`}
              playerUrl={playerUrl}
              animeId={animeId || 'unknown'}
              initialEpisodeId={playerEpisodeId}
              onPlayerButtonClick={handlePlayerButtonClick}
              onPlayOffline={handlePlayFromLibrary}
              onBack={() => {
                log.debug('Player back button clicked');
                playerHistoryManager.discard();
                handlePlayerClose(playerUrl);

                if (playerReturnsBack) {
                  webViewRef.current?.goBack();
                }
              }}
              onHome={() => {
                log.debug('Player home button clicked');
                webViewRef.current?.goHome();
                handlePlayerClose(playerUrl);
              }}
              onNavigateToUrl={(url: string) => {
                log.debug('Player navigate to URL:', url);
                playerHistoryManager.commit(url);
                webViewRef.current?.navigateTo(url);
                handlePlayerClose(playerUrl);
              }}
            />
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
