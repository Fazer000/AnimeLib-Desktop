import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';
import { installDebugApi } from './utils/debugApi';
import SiteChoicePage from './pages/SiteChoicePage';
import WebView from './pages/WebViewPage';
import type { WebViewPageRef } from './pages/WebViewPage';
import PlayerPage from './pages/PlayerPage';
import { buildAnimePageUrl, getHomeUrl } from './utils/urlHelpers';
import { findLibSiteByUrl, libSiteHomeUrl } from './utils/libSites';
import {
  readStartSite,
  saveSiteMirror,
  saveStartSite,
} from './utils/siteMirrors';
import OfflineButton from './components/offline/OfflineButton';
import ReportButton from './components/report/ReportButton';
import SideRail from './components/sideRail/SideRail';
import BookmarksFlyout from './components/sideRail/BookmarksFlyout';
import { LIB_SITES, LibSite } from '../constants';
import { animeApi } from './api/animeApi';
import type { ReadingBookmark } from './utils/readingBookmarks';
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
import { checkConnectionFast } from './services/connectivity';

import { createLogger } from '../shared/logger';
import { createAppTheme } from './theme/appTheme';
import useColorScheme from './hooks/useColorScheme';

const log = createLogger('App');

installDebugApi();

/**
 * С чего открыть приложение: главная базового сайта; у прежних установок
 * без базового сайта — сохранённый адрес AnimeLib; при первом запуске —
 * null, и пользователь выбирает сайт
 */
const initialStartUrl = (): string | null => {
  const startSite = readStartSite();
  if (startSite) return libSiteHomeUrl(startSite, getHomeUrl());

  return localStorage.getItem('animeLibUrl');
};

function App() {
  const scheme = useColorScheme();
  const theme = useMemo(() => createAppTheme(scheme), [scheme]);

  const [savedUrl, setSavedUrl] = useState<string | null>(initialStartUrl);
  const [sitesRequest, setSitesRequest] = useState(0);
  const [pageUrl, setPageUrl] = useState<string>('');
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
  const currentSite =
    findLibSiteByUrl(pageUrl || savedUrl || '') ?? LIB_SITES[0];
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

  const handleSiteChoice = useCallback((site: LibSite, mirror: string) => {
    saveSiteMirror(site, mirror);
    saveStartSite(site);
    setSavedUrl(mirror);
  }, []);

  const handleOpenReading = useCallback(
    async (bookmark: ReadingBookmark) => {
      const { origin } = new URL(
        webViewRef.current?.getCurrentUrl() || pageUrl,
      );
      let { path } = bookmark;

      if (!bookmark.started) {
        try {
          path =
            (await animeApi.getReadingPath(
              currentSite.siteId,
              bookmark.slugUrl,
            )) ?? path;
        } catch (error) {
          log.error('Error resolving first chapter:', error);
        }
      }

      webViewRef.current?.navigateTo(`${origin}${path}`);
    },
    [pageUrl, currentSite.siteId],
  );

  const handleSelectMirror = useCallback((site: LibSite, mirror: string) => {
    saveSiteMirror(site, mirror);
    webViewRef.current?.navigateTo(mirror);
  }, []);

  const handlePlayFromLibrary = useCallback(
    async (id: string, episodeId?: number) => {
      if (await checkConnectionFast()) {
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SiteChoicePage onSubmit={handleSiteChoice} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
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
            onPageUrlChange={setPageUrl}
            onRequestSites={() => setSitesRequest((count) => count + 1)}
            sidebar={
              <SideRail
                site={currentSite}
                sitesRequest={sitesRequest}
                suspended={Boolean(playerUrl || offlineTarget)}
                onSelectMirror={handleSelectMirror}
                onSelectSite={(site) =>
                  webViewRef.current?.navigateTo(
                    libSiteHomeUrl(site, getHomeUrl()),
                  )
                }
                renderBookmarks={(close) => (
                  <BookmarksFlyout
                    site={currentSite}
                    watching={bookmarks}
                    offlineItems={offlineContinue}
                    useOffline={!isOnline}
                    onSelectWatching={(bookmark) => {
                      close();
                      handlePlayerButtonClick(
                        buildAnimePageUrl(bookmark.animeSlugUrl),
                        bookmark.animeSlugUrl,
                      );
                    }}
                    onSelectOffline={(item) => {
                      close();
                      handlePlayFromLibrary(item.animeId, item.episodeId);
                    }}
                    onOpenReading={(bookmark) => {
                      close();
                      handleOpenReading(bookmark);
                    }}
                  />
                )}
                downloads={
                  <OfflineButton
                    onPlayOffline={handlePlayFromLibrary}
                    openTab={libraryTab}
                    onOpenHandled={() => setLibraryTab(null)}
                  />
                }
                report={<ReportButton />}
              />
            }
          />
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

/**
 * Корень приложения: ловит ошибки рендера, чтобы окно не оставалось белым
 */
export default function AppRoot() {
  const scheme = useColorScheme();
  const theme = useMemo(() => createAppTheme(scheme), [scheme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary title="Произошла ошибка в приложении">
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
