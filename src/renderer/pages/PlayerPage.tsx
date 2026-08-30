import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import {
  animeApi,
  Episode,
  Player,
  KodikVideoLinks,
  RelatedAnime as RelatedAnimeType,
} from '../api/animeApi';
import CustomToolbar from '../components/Toolbar';
import VideoPlayer, { VideoPlayerRef } from '../components/player/VideoPlayer';
import ErrorBoundary from '../components/player/ErrorBoundary';
import EpisodeSlider from '../components/player/EpisodeSlider';
import PlayerSidebar from '../components/player/PlayerSidebar';
import CommentsSection from '../components/player/CommentsSection';
import ScrollToTopButton from '../components/player/ScrollToTopButton';
import RelatedAnime from '../components/player/RelatedAnime';
import AmbientLight from '../components/player/AmbientLight';
import DownloadManagerDialog from '../components/offline/DownloadManagerDialog';
import { PlayerSelectionManager, BookmarkManager } from '../services/player';
import { offlineCatalog, progressStore } from '../services/offline';
import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  MIN_VIDEO_AREA_HEIGHT,
  PLAYER_BORDER_RADIUS,
  SIDEBAR_WIDTH_CSS,
  TOOLBAR_HEIGHT,
} from '../../constants';
import { getFittedWidth, getFittedHeight } from '../utils/videoHelpers';
import { buildAnimePageUrl } from '../utils/urlHelpers';
import { usePersistedFlag } from '../hooks/usePersistedFlag';
import { useFullscreenState } from '../hooks/useFullscreenState';

import { createLogger } from '../../shared/logger';

const log = createLogger('PlayerPage');

interface PlayerPageProps {
  playerUrl: string;
  animeId: string;
  onBack: () => void;
  onHome?: () => void;
  onNavigateToUrl?: (url: string) => void;
  // eslint-disable-next-line react/require-default-props
  onPlayerButtonClick?: (url: string, animeId?: string) => void;
  offlineMode?: boolean;
  initialEpisodeId?: number;
  onPlayOffline?: (animeId: string, episodeId?: number) => void;
}

/**
 * PlayerPage - Main player page with episodes and voice team selection
 *
 * Uses OOP architecture with:
 * - PlayerSelectionManager for player selection logic
 * - EpisodeSlider component for episode navigation
 * - PlayerSidebar component for player/voice team list
 */
function PlayerPageRefactored({
  playerUrl,
  animeId,
  onBack,
  onHome,
  onNavigateToUrl,
  onPlayerButtonClick,
  offlineMode = false,
  initialEpisodeId,
  onPlayOffline,
}: PlayerPageProps) {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const shouldAutoplayNextEpisodeRef = useRef<boolean>(false);
  const episodeRequestIdRef = useRef<number>(0);

  const [currentAnimeId] = useState<string>(animeId);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);

  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPlayerType, setSelectedPlayerType] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [show404, setShow404] = useState<boolean>(false);
  const [kodikError, setKodikError] = useState<boolean>(false);

  const [initialTimecode, setInitialTimecode] = useState<number | null>(null);
  const [hasBookmark, setHasBookmark] = useState<boolean>(false);
  const [bookmarkChecked, setBookmarkChecked] = useState<boolean>(false);
  const [bookmarkedEpisodeId, setBookmarkedEpisodeId] = useState<number | null>(
    null,
  );

  const [autoplayEnabled, handleAutoplayChange] = usePersistedFlag(
    'playerAutoplayEnabled',
    false,
  );

  const [ambientLightEnabled, handleAmbientLightChange] = usePersistedFlag(
    'playerAmbientLightEnabled',
    true,
  );

  const [relatedAnime, setRelatedAnime] = useState<RelatedAnimeType[]>([]);

  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedFlag(
    offlineMode ? 'playerSidebarCollapsedOffline' : 'playerSidebarCollapsed',
    offlineMode,
  );

  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  const [showDownloadManager, setShowDownloadManager] =
    useState<boolean>(false);

  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  const playerLoadedRef = useRef<boolean>(false);

  const isPlayerFullscreen = useFullscreenState();

  const [playerSelectionManager] = useState(() => new PlayerSelectionManager());
  const [bookmarkManager] = useState(
    () =>
      new BookmarkManager({
        onEpisodeFound: (episodeIndex) => {
          log.debug('Bookmark manager found episode:', episodeIndex);
        },
        onTimecodeReady: (timecode) => {
          log.debug('Bookmark manager timecode ready:', timecode);
        },
      }),
  );

  /**
   * Load all episodes for current anime
   */
  const loadEpisodes = useCallback(async (): Promise<void> => {
    if (!currentAnimeId) return;

    if (offlineMode) {
      const offlineEpisodes = offlineCatalog.getEpisodes(currentAnimeId);
      setEpisodes(offlineEpisodes);
      log.debug('Offline episodes:', offlineEpisodes.length);
      return;
    }

    setLoading(true);
    try {
      const data = await animeApi.getEpisodes(currentAnimeId);
      setEpisodes(data.data);
      log.debug('Loaded episodes:', data.data.length);
    } catch (err) {
      log.error('Error loading episodes:', err);
    } finally {
      setLoading(false);
    }
  }, [currentAnimeId, offlineMode]);

  /**
   * Load and process bookmark for current anime
   */
  const loadBookmark = useCallback(
    async (loadedEpisodes: Episode[]): Promise<void> => {
      if (!currentAnimeId || bookmarkManager.isProcessed()) {
        return;
      }

      if (offlineMode) {
        const latest = progressStore.getLatestForAnime(currentAnimeId);
        const progress = initialEpisodeId
          ? progressStore.get(currentAnimeId, initialEpisodeId)
          : latest;

        const targetId = initialEpisodeId ?? latest?.episodeId ?? null;
        const index = targetId
          ? loadedEpisodes.findIndex((item) => item.id === targetId)
          : -1;

        if (index >= 0) {
          setCurrentEpisodeIndex(index);
        }

        if (latest && latest.seconds > 0) {
          setBookmarkedEpisodeId(latest.episodeId);
        }

        if (
          progress &&
          progress.episodeId === targetId &&
          progress.seconds > 0
        ) {
          setInitialTimecode(progress.seconds);
          setHasBookmark(true);
          log.debug('Offline progress:', progress.seconds);
        }

        setBookmarkChecked(true);
        return;
      }

      try {
        const result = await bookmarkManager.loadBookmark(
          currentAnimeId,
          loadedEpisodes,
        );

        const targetIndex = initialEpisodeId
          ? loadedEpisodes.findIndex((item) => item.id === initialEpisodeId)
          : -1;

        if (targetIndex >= 0 && initialEpisodeId) {
          const local = progressStore.get(currentAnimeId, initialEpisodeId);
          const isSameEpisode =
            bookmarkManager.getBookmarkedEpisodeId() === initialEpisodeId;
          const remote = isSameEpisode ? result.timecodeSeconds : null;
          const useLocal =
            Boolean(local) && (!local?.synced || local.seconds > (remote ?? 0));
          const seconds = useLocal ? (local?.seconds ?? 0) : (remote ?? 0);

          if (seconds > 0) {
            setInitialTimecode(seconds);
            setHasBookmark(true);
          }

          setBookmarkedEpisodeId(bookmarkManager.getBookmarkedEpisodeId());
          setCurrentEpisodeIndex(targetIndex);
          setBookmarkChecked(true);
          log.debug(
            'Requested episode:',
            targetIndex,
            useLocal ? 'local progress' : 'site bookmark',
            seconds,
          );
          return;
        }

        if (result.episodeIndex !== null) {
          log.debug(
            'Bookmark found - episode:',
            result.episodeIndex,
            'timecode:',
            result.timecodeSeconds,
          );

          if (result.timecodeSeconds !== null) {
            setInitialTimecode(result.timecodeSeconds);
            log.debug(
              `Bookmark timecode set BEFORE episode change: ${result.timecodeSeconds}s`,
            );
          }

          setHasBookmark(true);

          const bookmarkedEpId = bookmarkManager.getBookmarkedEpisodeId();
          setBookmarkedEpisodeId(bookmarkedEpId);
          log.debug('Bookmarked episode ID:', bookmarkedEpId);

          setCurrentEpisodeIndex(result.episodeIndex);
          log.debug('Switching to bookmarked episode:', result.episodeIndex);
        } else {
          log.debug('No bookmark found, using first episode');
        }

        setBookmarkChecked(true);
      } catch (err) {
        log.error('Error loading bookmark:', err);
        setBookmarkChecked(true);
      }
    },
    [currentAnimeId, bookmarkManager, offlineMode, initialEpisodeId],
  );

  /**
   * Load players for specific episode
   */
  const loadEpisodePlayers = useCallback(
    async (episodeId: number, requestId: number): Promise<void> => {
      if (offlineMode) {
        const offlinePlayers = offlineCatalog.getPlayers(
          currentAnimeId,
          episodeId,
        );
        setPlayers(offlinePlayers);
        log.debug('Offline players:', offlinePlayers.length);
        return;
      }

      setLoading(true);
      try {
        const data = await animeApi.getEpisodePlayers(episodeId);
        if (requestId !== episodeRequestIdRef.current) {
          log.debug('Stale players response ignored:', episodeId);
          return;
        }
        setPlayers(data.data.players);
        log.debug('Loaded players:', data.data.players.length);
      } catch (err) {
        log.error('Error loading players:', err);
        if (requestId === episodeRequestIdRef.current) {
          setPlayers([]);
        }
      } finally {
        if (requestId === episodeRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [offlineMode, currentAnimeId],
  );
  /**
   * Load Kodik video links
   */
  const loadKodikLinks = useCallback(
    async (kodikSrc: string): Promise<KodikVideoLinks | null> => {
      setLoading(true);
      setKodikError(false);
      try {
        const data = await animeApi.getKodikVideoLinks(kodikSrc);
        log.debug('Loaded Kodik links:', data.success);
        if (!data.success) {
          setKodikError(true);
          return null;
        }
        return data;
      } catch (err) {
        log.error('Error loading Kodik links:', err);
        setKodikError(true);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Load related anime
   */
  const loadRelatedAnime = useCallback(async (): Promise<void> => {
    if (!currentAnimeId || offlineMode) return;

    try {
      const data = await animeApi.getRelatedAnime(currentAnimeId);
      setRelatedAnime(data.data);
      log.debug('Loaded related anime:', data.data.length);
    } catch (err) {
      log.error('Error loading related anime:', err);
      setRelatedAnime([]);
    }
  }, [currentAnimeId, offlineMode]);

  /**
   * Initialize episodes on mount
   */
  useEffect(() => {
    loadEpisodes();
    loadRelatedAnime();
  }, [loadEpisodes, loadRelatedAnime]);

  /**
   * Check and load bookmark after episodes are loaded
   */
  useEffect(() => {
    if (episodes.length > 0 && !bookmarkManager.isProcessed()) {
      loadBookmark(episodes);
    }
  }, [episodes, bookmarkManager, loadBookmark]);

  /**
   * Handle episode change - complete reinitialization
   */
  useEffect(() => {
    if (!bookmarkChecked) {
      log.debug('Waiting for bookmark check before loading episode...');
      return;
    }

    if (episodes.length > 0 && currentEpisodeIndex < episodes.length) {
      const episode = episodes[currentEpisodeIndex];
      episodeRequestIdRef.current += 1;
      const requestId = episodeRequestIdRef.current;
      log.debug('Episode change started:', episode.number);
      log.debug(
        'Current initialTimecode:',
        initialTimecode,
        '(will be preserved)',
      );

      if (videoPlayerRef.current) {
        log.debug('Clearing current player');
        videoPlayerRef.current.destroyPlayer();
      }

      setSelectedPlayer(null);
      setSelectedPlayerType('');
      playerLoadedRef.current = false;

      setSelectedEpisode(episode);

      const currentBookmark = bookmarkManager.getCurrentBookmark();
      if (currentBookmark && currentBookmark.item_id === episode.id) {
        setHasBookmark(true);
        log.debug('This episode has a bookmark');
      } else {
        setHasBookmark(false);
      }

      log.debug('Loading players for episode:', episode.number);
      loadEpisodePlayers(episode.id, requestId);

      log.debug('Episode change completed:', episode.number);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentEpisodeIndex,
    episodes,
    loadEpisodePlayers,
    bookmarkManager,
    bookmarkChecked,
  ]);

  /**
   * Auto-select player based on saved preferences or fallback to AnimeLib/Kodik
   */
  useEffect(() => {
    if (players.length === 0) {
      return;
    }

    if (playerLoadedRef.current) {
      log.debug(
        'Player already loaded for this episode, skipping auto-selection',
      );
      return;
    }

    const requestId = episodeRequestIdRef.current;

    const selectAndLoadPlayer = async () => {
      const autoSelected =
        playerSelectionManager.autoSelectPlayerOrFallback(players);

      if (!autoSelected) {
        return;
      }

      log.debug(
        'Auto-selecting player:',
        autoSelected.team.name,
        autoSelected.player,
      );

      if (initialTimecode !== null) {
        log.debug(
          'Bookmark timecode exists, will be applied after player loads:',
          initialTimecode,
        );
      }

      setSelectedPlayer(autoSelected);

      playerLoadedRef.current = true;

      if (videoPlayerRef.current) {
        const shouldAutoplay = shouldAutoplayNextEpisodeRef.current;
        shouldAutoplayNextEpisodeRef.current = false;

        if (autoSelected.player === 'Kodik' && autoSelected.src) {
          log.debug('Loading Kodik player');
          const kodikData = await loadKodikLinks(autoSelected.src);

          if (requestId !== episodeRequestIdRef.current) {
            log.debug('Stale Kodik links ignored');
            return;
          }

          if (kodikData) {
            videoPlayerRef.current.loadPlayer(
              autoSelected,
              kodikData,
              shouldAutoplay,
            );
          }
        } else {
          log.debug('Loading non-Kodik player:', autoSelected.team.name);
          videoPlayerRef.current.loadPlayer(autoSelected, null, shouldAutoplay);
        }
      }
    };

    selectAndLoadPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, loadKodikLinks, playerSelectionManager]);

  /**
   * Синхронизирует активную вкладку сайдбара с типом активного плеера
   */
  useEffect(() => {
    if (selectedPlayer && players.some((p) => p.id === selectedPlayer.id)) {
      setSelectedPlayerType(selectedPlayer.player);
      return;
    }

    const groupedPlayers = PlayerSelectionManager.groupPlayersByType(players);
    if (Object.keys(groupedPlayers).length === 0) {
      return;
    }

    const autoType = playerSelectionManager.autoSelectPlayerType(
      groupedPlayers,
      selectedPlayerType,
    );
    if (autoType && autoType !== selectedPlayerType) {
      setSelectedPlayerType(autoType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer, players, playerSelectionManager]);

  /**
   * Handle video error
   */
  const handleVideoError = useCallback((err: string) => {
    log.error('VideoPlayer error:', err);
    if (
      err.includes('Ошибка загрузки видео') ||
      err.includes('Failed to load')
    ) {
      setShow404(true);
    }
  }, []);

  /**
   * Handle player selection
   */
  const handlePlayerSelect = useCallback(
    async (player: Player) => {
      log.debug('Player selected:', player.team.name, player.player);

      const requestId = episodeRequestIdRef.current;

      setShow404(false);
      setKodikError(false);
      setSelectedPlayer(player);

      playerSelectionManager.savePreference(player.team.name, player.player);

      if (videoPlayerRef.current) {
        if (player.player === 'Kodik' && player.src) {
          log.debug('Loading Kodik player');
          const kodikData = await loadKodikLinks(player.src);
          if (requestId !== episodeRequestIdRef.current) {
            log.debug('Stale Kodik links ignored');
            return;
          }
          if (kodikData) {
            videoPlayerRef.current.loadPlayer(player, kodikData);
          }
        } else {
          log.debug('Loading non-Kodik player:', player.team.name);
          videoPlayerRef.current.loadPlayer(player, null);
        }
      }
    },
    [loadKodikLinks, playerSelectionManager],
  );

  /**
   * Handle player refresh
   */
  const handleRefresh = useCallback(async () => {
    log.debug('Refreshing player');

    if (!selectedPlayer || !videoPlayerRef.current) {
      log.warn('Cannot refresh: no player selected');
      return;
    }

    const requestId = episodeRequestIdRef.current;

    setShow404(false);
    setKodikError(false);

    if (selectedPlayer.player === 'Kodik' && selectedPlayer.src) {
      log.debug('Refreshing Kodik player');
      const kodikData = await loadKodikLinks(selectedPlayer.src);
      if (requestId !== episodeRequestIdRef.current) {
        log.debug('Stale Kodik links ignored');
        return;
      }
      if (kodikData) {
        videoPlayerRef.current.loadPlayer(selectedPlayer, kodikData);
      }
    } else {
      log.debug('Refreshing non-Kodik player');
      videoPlayerRef.current.loadPlayer(selectedPlayer, null);
    }
  }, [selectedPlayer, loadKodikLinks]);

  /**
   * Handle player type selection
   */
  const handlePlayerTypeSelect = useCallback((playerType: string) => {
    log.debug('Switching to player type tab:', playerType);
    setSelectedPlayerType(playerType);
  }, []);

  /**
   * Handle episode selection (manual, without autoplay)
   */
  const handleEpisodeClick = useCallback(
    (episodeIndex: number) => {
      if (episodeIndex !== currentEpisodeIndex) {
        log.debug('Switching to episode (manual):', episodeIndex + 1);
        setCurrentEpisodeIndex(episodeIndex);
        setHasBookmark(false);
        setInitialTimecode(null);
      }
    },
    [currentEpisodeIndex],
  );

  /**
   * Handle episode selection with autoplay (from navigation hints)
   */
  const handleEpisodeClickWithAutoplay = useCallback(
    (episodeIndex: number) => {
      if (episodeIndex !== currentEpisodeIndex) {
        log.debug('Switching to episode (from hint):', episodeIndex + 1);
        setCurrentEpisodeIndex(episodeIndex);
        setHasBookmark(false);
        setInitialTimecode(null);

        shouldAutoplayNextEpisodeRef.current = true;
      }
    },
    [currentEpisodeIndex],
  );

  /**
   * Handle autoplay change
   */
  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  /**
   * Сохраняет закладку с текущим таймкодом в фоне
   */
  const saveBookmarkInBackground = useCallback(() => {
    const currentEpisode = episodes[currentEpisodeIndex];

    if (
      !currentEpisode ||
      !videoPlayerRef.current?.videoRef.current ||
      !currentAnimeId ||
      !selectedPlayer
    ) {
      return;
    }

    const currentTime =
      videoPlayerRef.current.videoRef.current.currentTime || 0;

    if (currentTime <= 0) {
      return;
    }

    log.debug('Auto-saving bookmark in background:', currentTime);

    const meta = {
      team: selectedPlayer.team.id,
      translation_type: selectedPlayer.translation_type.id,
      player: selectedPlayer.player,
      item_number: currentEpisode.number,
    };

    const persist = (synced: boolean) =>
      progressStore.save({
        animeId: currentAnimeId,
        episodeId: currentEpisode.id,
        itemNumber: currentEpisode.number,
        seconds: currentTime,
        teamId: selectedPlayer.team.id,
        translationTypeId: selectedPlayer.translation_type?.id ?? 0,
        playerType: selectedPlayer.player,
        synced,
      });

    bookmarkManager
      .saveBookmark(currentAnimeId, currentEpisode.id, currentTime, meta)
      .then((success) => {
        persist(success);
        log.debug('Background bookmark synced:', success);
        return null;
      })
      .catch((err) => {
        persist(false);
        log.error('Error saving bookmark in background:', err);
        return null;
      });
  }, [
    episodes,
    currentEpisodeIndex,
    currentAnimeId,
    bookmarkManager,
    selectedPlayer,
  ]);

  /**
   * Покидает плеер: сохраняет закладку, очищает видео-заголовки и переходит далее
   */
  const exitPlayer = useCallback(
    (navigate: () => void) => {
      saveBookmarkInBackground();

      if ((window as any).electron?.electronAPI?.clearVideoHeaders) {
        (window as any).electron.electronAPI
          .clearVideoHeaders()
          .then(() => {
            log.debug('Video headers cleared');
            navigate();
            return null;
          })
          .catch((err: any) => {
            log.error('Error clearing video headers:', err);
            navigate();
            return null;
          });
      } else {
        navigate();
      }
    },
    [saveBookmarkInBackground],
  );

  /**
   * Открывает главную страницу связанного аниме в WebView
   */
  const handleRelatedAnimeClick = useCallback(
    (slugUrl: string) => {
      const animeUrl = buildAnimePageUrl(slugUrl);
      log.debug('Opening related anime page:', animeUrl);

      if (!onNavigateToUrl) {
        log.warn('onNavigateToUrl not provided');
        return;
      }

      exitPlayer(() => onNavigateToUrl(animeUrl));
    },
    [exitPlayer, onNavigateToUrl],
  );

  /**
   * Открывает главную страницу текущего тайтла в WebView
   */
  const handleOpenAnimePage = useCallback(() => {
    if (!currentAnimeId) return;
    handleRelatedAnimeClick(currentAnimeId);
  }, [currentAnimeId, handleRelatedAnimeClick]);

  /**
   * Handle back navigation - with auto-save bookmark
   */
  const handleBack = useCallback(() => {
    log.debug('Going back');
    exitPlayer(onBack);
  }, [exitPlayer, onBack]);

  /**
   * Handle URL change
   */
  const handleUrlChange = useCallback(
    (newUrl: string) => {
      log.debug('URL changed:', newUrl);
      if (onNavigateToUrl) {
        onNavigateToUrl(newUrl);
      } else {
        log.warn('onNavigateToUrl not provided');
      }
    },
    [onNavigateToUrl],
  );

  const handleMinimize = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.sendMessage('window-minimize');
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.sendMessage('window-maximize');
    }
  }, []);

  const handleClose = useCallback(() => {
    if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.sendMessage('window-close');
    }
  }, []);

  /**
   * Save bookmark handler
   */
  const handleSaveBookmark = useCallback(
    async (episodeId: number, currentTime: number) => {
      if (!currentAnimeId || !selectedPlayer) {
        log.warn('Cannot save bookmark: no animeId or player');
        return;
      }

      const episode = episodes.find((ep) => ep.id === episodeId);
      if (!episode) {
        log.warn('Cannot save bookmark: episode not found');
        return;
      }

      const meta = {
        team: selectedPlayer.team.id,
        translation_type: selectedPlayer.translation_type.id,
        player: selectedPlayer.player,
        item_number: episode.number,
      };

      log.debug('Saving bookmark:', {
        animeId: currentAnimeId,
        episodeId,
        currentTime,
        meta,
      });

      const success = await bookmarkManager.saveBookmark(
        currentAnimeId,
        episodeId,
        currentTime,
        meta,
      );

      progressStore.save({
        animeId: currentAnimeId,
        episodeId,
        itemNumber: episode.number,
        seconds: currentTime,
        teamId: selectedPlayer.team.id,
        translationTypeId: selectedPlayer.translation_type?.id ?? 0,
        playerType: selectedPlayer.player,
        synced: success,
      });

      setHasBookmark(true);
      setBookmarkedEpisodeId(episodeId);

      if (success) {
        log.debug('Bookmark saved successfully');
      } else {
        log.warn('Bookmark kept locally, will sync later');
      }
    },
    [currentAnimeId, bookmarkManager, selectedPlayer, episodes],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      log.debug('Component unmounting, clearing video headers');
      if ((window as any).electron?.electronAPI?.clearVideoHeaders) {
        (window as any).electron.electronAPI
          .clearVideoHeaders()
          .catch((err: any) => {
            log.error('Error clearing video headers on unmount:', err);
          });
      }
    };
  }, []);

  // @ts-ignore
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0a0a',
        overflow: 'hidden',
      }}
    >
      <CustomToolbar
        onBack={handleBack}
        onRefresh={handleRefresh}
        onHome={() => {
          log.debug('Home button clicked');
          if (onHome) {
            onHome();
          } else {
            log.warn('onHome not provided, falling back to onBack');
            onBack();
          }
        }}
        canGoBack
        backgroundColor="#252527"
        height={TOOLBAR_HEIGHT}
        isPlayerPage
        showUrlInput={showUrlInput}
        currentUrl={playerUrl}
        animeId={offlineMode ? undefined : currentAnimeId}
        onOpenAnimePage={handleOpenAnimePage}
        onUrlChange={handleUrlChange}
        onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
        onPlayerButtonClick={onPlayerButtonClick}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      <Box
        id="player-page-scroll-container"
        sx={{
          flex: 1,
          position: 'relative',
          marginTop: `${TOOLBAR_HEIGHT}px`,
          overflow: 'auto',
        }}
      >
        <Box
          sx={{
            height: `calc(100vh - ${TOOLBAR_HEIGHT}px)`,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            isolation: 'isolate',
          }}
        >
          {videoPlayerRef.current?.videoRef && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: sidebarCollapsed ? 0 : SIDEBAR_WIDTH_CSS,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                containerType: 'size',
              }}
            >
              <Box
                sx={{
                  width: getFittedWidth(
                    videoAspectRatio || DEFAULT_VIDEO_ASPECT_RATIO,
                  ),
                  height: 'auto',
                  aspectRatio: (
                    videoAspectRatio || DEFAULT_VIDEO_ASPECT_RATIO
                  ).toFixed(4),
                  position: 'relative',
                }}
              >
                <AmbientLight
                  videoRef={videoPlayerRef.current.videoRef}
                  isPlaying={isVideoPlaying}
                  isFullscreen={isPlayerFullscreen}
                  enabled={ambientLightEnabled}
                />
              </Box>
            </Box>
          )}

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
              containerType: 'size',
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: `calc(100% - ${SIDEBAR_WIDTH_CSS})`,
                height: '100%',
                minHeight: `${MIN_VIDEO_AREA_HEIGHT}px`,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                zIndex: 0,
                containerType: 'size',
              }}
            >
              <Box
                sx={{
                  width: getFittedWidth(
                    videoAspectRatio || DEFAULT_VIDEO_ASPECT_RATIO,
                  ),
                  height: 'auto',
                  aspectRatio: (
                    videoAspectRatio || DEFAULT_VIDEO_ASPECT_RATIO
                  ).toFixed(4),
                  position: 'relative',
                  borderRadius: PLAYER_BORDER_RADIUS,
                  overflow: 'hidden',
                  boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
                  margin: 1,
                  marginRight: 0,
                  zIndex: 1,
                }}
              >
                <ErrorBoundary>
                  {show404 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#000',
                        color: '#ffffff',
                        textAlign: 'center',
                        zIndex: 10,
                      }}
                    >
                      <Typography
                        variant="h1"
                        sx={{
                          fontSize: '120px',
                          fontWeight: 'bold',
                          color: '#7C3AED',
                        }}
                      >
                        404
                      </Typography>
                      <Typography
                        variant="h4"
                        color="#bfbfbf"
                        sx={{
                          marginBottom: 1,
                        }}
                      >
                        Видео не найдено
                      </Typography>
                    </Box>
                  )}

                  {kodikError && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#000',
                        color: '#ffffff',
                        textAlign: 'center',
                        zIndex: 10,
                        gap: 2,
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: '#7C3AED', fontWeight: 'bold' }}
                      >
                        Ошибка Kodik
                      </Typography>
                      <Typography variant="body1" color="#bfbfbf">
                        Не удалось получить ссылку на видео. Сервис недоступен
                        или превышено время ожидания.
                      </Typography>
                      <Box
                        component="button"
                        onClick={handleRefresh}
                        sx={{
                          mt: 1,
                          px: 3,
                          py: 1,
                          backgroundColor: '#7C3AED',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#6D28D9' },
                        }}
                      >
                        Повторить
                      </Box>
                    </Box>
                  )}

                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      visibility: show404 || kodikError ? 'hidden' : 'visible',
                    }}
                  >
                    <VideoPlayer
                      ref={videoPlayerRef}
                      onError={handleVideoError}
                      animeId={currentAnimeId}
                      episodeName={selectedEpisode ? selectedEpisode.name : ''}
                      episodes={episodes}
                      currentEpisodeIndex={currentEpisodeIndex}
                      onEpisodeSelect={handleEpisodeClick}
                      onEpisodeSelectWithAutoplay={
                        handleEpisodeClickWithAutoplay
                      }
                      onAspectRatioChange={setVideoAspectRatio}
                      onPlayingChange={setIsVideoPlaying}
                      initialTimecode={initialTimecode}
                      onTimecodeApplied={() => {
                        log.debug('Timecode applied successfully, clearing...');
                        setInitialTimecode(null);
                      }}
                      onSaveBookmark={handleSaveBookmark}
                      hasBookmark={hasBookmark}
                      bookmarkedEpisodeId={bookmarkedEpisodeId}
                      autoplayEnabled={autoplayEnabled}
                      onAutoplayChange={handleAutoplayChange}
                      ambientLightEnabled={ambientLightEnabled}
                      onAmbientLightChange={handleAmbientLightChange}
                      selectedPlayer={selectedPlayer}
                      timecode={selectedPlayer?.timecode || []}
                      sidebarCollapsed={sidebarCollapsed}
                      onSidebarToggle={handleSidebarToggle}
                      onOpenDownloadManager={() => setShowDownloadManager(true)}
                      downloadManagerOpen={showDownloadManager}
                      offlineMode={offlineMode}
                    />
                  </Box>
                </ErrorBoundary>
              </Box>
            </Box>

            <Box
              sx={{
                position: 'relative',
                zIndex: 2,
                alignSelf: 'center',
                height: getFittedHeight(
                  videoAspectRatio || DEFAULT_VIDEO_ASPECT_RATIO,
                  SIDEBAR_WIDTH_CSS,
                ),
              }}
            >
              <PlayerSidebar
                players={players}
                selectedPlayer={selectedPlayer}
                selectedPlayerType={selectedPlayerType}
                loading={loading}
                onPlayerSelect={handlePlayerSelect}
                onPlayerTypeSelect={handlePlayerTypeSelect}
                isCollapsed={sidebarCollapsed}
              />
            </Box>
          </Box>

          <Box sx={{ position: 'relative', zIndex: 3, flexShrink: 0, mb: 1 }}>
            <EpisodeSlider
              episodes={episodes}
              currentEpisodeIndex={currentEpisodeIndex}
              onEpisodeSelect={handleEpisodeClick}
              bookmarkedEpisodeId={bookmarkedEpisodeId}
            />
          </Box>
        </Box>

        {!offlineMode && relatedAnime.length > 0 && (
          <RelatedAnime
            key={currentAnimeId}
            relatedAnime={relatedAnime}
            onAnimeClick={handleRelatedAnimeClick}
          />
        )}

        {!offlineMode && selectedEpisode && (
          <CommentsSection
            episodeId={selectedEpisode.id}
            animeSlug={currentAnimeId}
            scrollContainerId="player-page-scroll-container"
          />
        )}

        <ScrollToTopButton
          threshold={400}
          scrollContainerId="player-page-scroll-container"
        />
      </Box>

      <DownloadManagerDialog
        open={showDownloadManager}
        onClose={() => setShowDownloadManager(false)}
        animeId={currentAnimeId}
        animeTitle={currentAnimeId}
        episodes={offlineMode ? [] : episodes}
        players={offlineMode ? [] : players}
        initialTab={offlineMode ? 2 : 0}
        onPlayOffline={onPlayOffline}
      />
    </Box>
  );
}

PlayerPageRefactored.defaultProps = {
  onHome: undefined,
  onNavigateToUrl: undefined,
  offlineMode: false,
  initialEpisodeId: undefined,
  onPlayOffline: undefined,
};
export default PlayerPageRefactored;
