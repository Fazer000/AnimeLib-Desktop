/* eslint-disable no-console */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import UrlInputPage from './pages/UrlInputPage';
import WebView from './pages/WebViewPage';
import type { WebViewPageRef } from './pages/WebViewPage';
import PlayerPage from './pages/PlayerPage';
import { buildAnimePageUrl, saveSiteUrl } from './utils/urlHelpers';
import ContinueWatchingButton from './components/ContinueWatchingButton';
import {
  NavigationHistoryTracker,
  playerHistoryManager,
} from './services/webview';
import useWatchingBookmarks from './hooks/useWatchingBookmarks';

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

  const webViewRef = useRef<WebViewPageRef>(null);
  const [playerReturnsBack, setPlayerReturnsBack] = useState<boolean>(false);

  useEffect(() => {
    NavigationHistoryTracker.install();
  }, []);

  const handlePlayerButtonClick = useCallback(
    (url: string, providedAnimeId?: string) => {
      console.log('[AnimeLIB] Opening player page for URL:', url);
      console.log('[AnimeLIB] Provided anime ID:', providedAnimeId);

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
            console.log(
              '[AnimeLIB] Using anime ID from saved page:',
              finalAnimeId,
            );
          } else {
            finalAnimeId = 'unknown';
          }
        }
      }

      console.log('[AnimeLIB] Final anime ID:', finalAnimeId);
      playerHistoryManager.open(
        url,
        finalAnimeId ?? 'unknown',
        webViewRef.current?.getCurrentUrl() ?? '',
      );
      NavigationHistoryTracker.record({ source: 'player-open', url });
      setPlayerReturnsBack(false);
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

    if ((window as any).electron?.ipcRenderer) {
      const unsubscribe = (window as any).electron.ipcRenderer.on(
        'open-player-page',
        (...args: unknown[]) => {
          const url = args[0] as string;
          console.log('[AnimeLIB] Received player page request:', url);
          handlePlayerButtonClick(url);
        },
      );

      return unsubscribe;
    }

    return undefined;
  }, [handlePlayerButtonClick]);

  useEffect(() => {
    if ((window as any).electron?.ipcRenderer) {
      const unsubscribe = (window as any).electron.ipcRenderer.on(
        'player-button-clicked',
        (...args: unknown[]) => {
          const url = args[0] as string;
          console.log('[AnimeLIB] Received player button click via IPC:', url);
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

  const handlePlayerClose = useCallback((url: string) => {
    NavigationHistoryTracker.record({ source: 'player-close', url });
    setPlayerUrl(null);
    setAnimeId(null);
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
            visibility: playerUrl ? 'hidden' : 'visible',
            pointerEvents: playerUrl ? 'none' : 'auto',
          }}
        >
          <WebView
            pageRef={webViewRef}
            savedUrl={savedUrl}
            hidden={Boolean(playerUrl)}
            onBeforeGoBack={handleBeforeGoBack}
            onPlayerButtonClick={handlePlayerButtonClick}
          />
          <ContinueWatchingButton
            bookmarks={bookmarks}
            onSelect={(bookmark) => {
              const url = buildAnimePageUrl(bookmark.animeSlugUrl);
              console.log('[App] Continue watching:', url);
              handlePlayerButtonClick(url, bookmark.animeSlugUrl);
            }}
          />
        </Box>

        {playerUrl && (
          <Box sx={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <PlayerPage
              playerUrl={playerUrl}
              animeId={animeId || 'unknown'}
              onBack={() => {
                console.log('[App] Player back button clicked');
                playerHistoryManager.discard();
                handlePlayerClose(playerUrl);

                if (playerReturnsBack) {
                  webViewRef.current?.goBack();
                }
              }}
              onHome={() => {
                console.log('[App] Player home button clicked');
                webViewRef.current?.goHome();
                handlePlayerClose(playerUrl);
              }}
              onNavigateToUrl={(url: string) => {
                console.log('[App] Player navigate to URL:', url);
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
