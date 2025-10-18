/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import UrlInputPage from './pages/UrlInputPage';
import WebView from './pages/WebViewPage';
import PlayerPage from './pages/PlayerPage';

// Расширяем типы MUI для кастомных цветов
declare module '@mui/material/styles' {
  interface CustomColors {
    // Dark Theme Colors
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

    // Light Theme Colors (for future use)
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

    // General Colors
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
      // Dark Theme Colors
      dtPrimaryColor: '#1c1c1c',
      dtSecondaryColor: '#7C3AED',
      dtBlueColor: '#2196f3',
      dtAlphaPrimaryColor: 'rgba(0, 0, 0, 0.19)', // #30000000
      dtBorderColor: '#464649',
      dtAlphaBorderColor: 'rgba(84, 84, 88, 0.44)', // #70545458
      dtLineColor: '#464649',
      dtHeaderColor: '#252527',
      dtPrimaryTextColor: '#bfbfbf',
      dtSecondaryTextColor: '#7C3AED',
      dtAccentTextColor: 'rgba(245, 245, 250, 0.5)', // #80F5F5FA

      // Light Theme Colors
      ltPrimaryColor: '#FFFFFF',
      ltSecondaryColor: '#7C3AED',
      ltBlueColor: '#1976D2',
      ltAlphaPrimaryColor: 'rgba(255, 255, 255, 0.10)', // #1AFFFFFF
      ltBorderColor: '#E0E0E0',
      ltAlphaBorderColor: 'rgba(224, 224, 224, 0.2)', // #33E0E0E0
      ltLineColor: '#AAAAAA',
      ltHeaderColor: '#ede7f6',
      ltPrimaryTextColor: '#212121',
      ltSecondaryTextColor: '#7C3AED',
      ltAccentTextColor: '#757575',

      // General Colors
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

  const handlePlayerButtonClick = useCallback(
    (url: string, providedAnimeId?: string) => {
      console.log('[AnimeLIB] Opening player page for URL:', url);
      console.log('[AnimeLIB] Provided anime ID:', providedAnimeId);

      // Используем предоставленный ID аниме или извлекаем из URL
      let finalAnimeId = providedAnimeId;
      if (!finalAnimeId) {
        // Сначала пытаемся извлечь из переданного URL
        const animeIdMatch = url.match(/\/anime\/([^/?]+)/);
        if (animeIdMatch) {
          [, finalAnimeId] = animeIdMatch;
        } else {
          // Если не нашли в URL, пытаемся взять из localStorage
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

    // Слушаем события от главного процесса
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

  // Слушаем IPC события от webview
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
    // Извлекаем только домен из URL
    const urlObj = new URL(url);
    const cleanUrl = `${urlObj.protocol}//${urlObj.host}/`;
    localStorage.setItem('animeLibUrl', cleanUrl);
    setSavedUrl(cleanUrl);
  }, []);

  // Если открыта страница плеера
  if (playerUrl) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <PlayerPage
          playerUrl={playerUrl}
          animeId={animeId || 'unknown'}
          onBack={() => {
            console.log('[App] Player back button clicked');

            // Переходим на страницу аниме по animeId
            if (animeId && animeId !== 'unknown') {
              const animeUrl = `https://v3.animelib.org/ru/anime/${animeId}`;
              console.log('[App] Returning to anime page:', animeUrl);
              setSavedUrl(animeUrl);
            } else {
              // Fallback: получаем сохранённую страницу из localStorage
              const savedCurrentPage = localStorage.getItem(
                'animeLibCurrentPage',
              );

              if (savedCurrentPage) {
                console.log('[App] Returning to saved page:', savedCurrentPage);
                setSavedUrl(savedCurrentPage);
              } else {
                console.log('[App] No saved page found, using default URL');
                const defaultUrl = localStorage.getItem('animeLibUrl');
                if (defaultUrl) {
                  setSavedUrl(defaultUrl);
                }
              }
            }

            setPlayerUrl(null);
            setAnimeId(null);
          }}
          onHome={() => {
            console.log('[App] Player home button clicked');

            // Переходим на главную страницу сайта
            const homeUrl = localStorage.getItem('animeLibUrl');
            if (homeUrl) {
              console.log('[App] Navigating to home URL:', homeUrl);
              setSavedUrl(homeUrl);
            } else {
              console.warn('[App] No home URL found in localStorage');
              // Fallback на дефолтный URL
              setSavedUrl('https://v3.animelib.org/');
            }

            setPlayerUrl(null);
            setAnimeId(null);
          }}
          onNavigateToUrl={(url: string) => {
            console.log('[App] Player navigate to URL:', url);
            setSavedUrl(url);
            setPlayerUrl(null);
            setAnimeId(null);
          }}
        />
      </ThemeProvider>
    );
  }

  // Если есть сохраненный URL, показываем WebView
  if (savedUrl) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <WebView
          savedUrl={savedUrl}
          onPlayerButtonClick={handlePlayerButtonClick}
        />
      </ThemeProvider>
    );
  }

  // Показываем форму ввода URL
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <UrlInputPage onSubmit={handleUrlSubmit} />
    </ThemeProvider>
  );
}

export default App;
