/* eslint-disable no-console */
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

  const [autoplayEnabled, setAutoplayEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('playerAutoplayEnabled') === 'true';
    } catch {
      return false;
    }
  });

  const [ambientLightEnabled, setAmbientLightEnabled] = useState<boolean>(
    () => {
      try {
        const stored = localStorage.getItem('playerAmbientLightEnabled');
        return stored === null ? true : stored === 'true';
      } catch {
        return true;
      }
    },
  );

  const [relatedAnime, setRelatedAnime] = useState<RelatedAnimeType[]>([]);

  const sidebarStorageKey = offlineMode
    ? 'playerSidebarCollapsedOffline'
    : 'playerSidebarCollapsed';

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(sidebarStorageKey);
      return saved === null ? offlineMode : saved === 'true';
    } catch {
      return offlineMode;
    }
  });

  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  const [showDownloadManager, setShowDownloadManager] =
    useState<boolean>(false);

  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoPlayerRef.current) {
        const playing = videoPlayerRef.current.isPlaying();
        setIsVideoPlaying((prev) => {
          if (prev !== playing) {
            return playing;
          }
          return prev;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const playerLoadedRef = useRef<boolean>(false);

  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPlayerFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const [playerSelectionManager] = useState(() => new PlayerSelectionManager());
  const [bookmarkManager] = useState(
    () =>
      new BookmarkManager({
        onEpisodeFound: (episodeIndex) => {
          console.log(
            '[PlayerPage] Bookmark manager found episode:',
            episodeIndex,
          );
        },
        onTimecodeReady: (timecode) => {
          console.log(
            '[PlayerPage] Bookmark manager timecode ready:',
            timecode,
          );
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
      console.log('[PlayerPage] Offline episodes:', offlineEpisodes.length);
      return;
    }

    setLoading(true);
    try {
      const data = await animeApi.getEpisodes(currentAnimeId);
      setEpisodes(data.data);
      console.log('[PlayerPage] Loaded episodes:', data.data.length);
    } catch (err) {
      console.error('[PlayerPage] Error loading episodes:', err);
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
          console.log('[PlayerPage] Offline progress:', progress.seconds);
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
          console.log(
            '[PlayerPage] Requested episode:',
            targetIndex,
            useLocal ? 'local progress' : 'site bookmark',
            seconds,
          );
          return;
        }

        if (result.episodeIndex !== null) {
          console.log(
            '[PlayerPage] Bookmark found - episode:',
            result.episodeIndex,
            'timecode:',
            result.timecodeSeconds,
          );

          if (result.timecodeSeconds !== null) {
            setInitialTimecode(result.timecodeSeconds);
            console.log(
              `[PlayerPage] Bookmark timecode set BEFORE episode change: ${result.timecodeSeconds}s`,
            );
          }

          setHasBookmark(true);

          const bookmarkedEpId = bookmarkManager.getBookmarkedEpisodeId();
          setBookmarkedEpisodeId(bookmarkedEpId);
          console.log('[PlayerPage] Bookmarked episode ID:', bookmarkedEpId);

          setCurrentEpisodeIndex(result.episodeIndex);
          console.log(
            '[PlayerPage] Switching to bookmarked episode:',
            result.episodeIndex,
          );
        } else {
          console.log('[PlayerPage] No bookmark found, using first episode');
        }

        setBookmarkChecked(true);
      } catch (err) {
        console.error('[PlayerPage] Error loading bookmark:', err);
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
        console.log('[PlayerPage] Offline players:', offlinePlayers.length);
        return;
      }

      setLoading(true);
      try {
        const data = await animeApi.getEpisodePlayers(episodeId);
        if (requestId !== episodeRequestIdRef.current) {
          console.log(
            '[PlayerPage] Stale players response ignored:',
            episodeId,
          );
          return;
        }
        setPlayers(data.data.players);
        console.log('[PlayerPage] Loaded players:', data.data.players.length);
      } catch (err) {
        console.error('[PlayerPage] Error loading players:', err);
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
        console.log('[PlayerPage] Loaded Kodik links:', data.success);
        if (!data.success) {
          setKodikError(true);
          return null;
        }
        return data;
      } catch (err) {
        console.error('[PlayerPage] Error loading Kodik links:', err);
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
      console.log('[PlayerPage] Loaded related anime:', data.data.length);
    } catch (err) {
      console.error('[PlayerPage] Error loading related anime:', err);
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
      console.log(
        '[PlayerPage] Waiting for bookmark check before loading episode...',
      );
      return;
    }

    if (episodes.length > 0 && currentEpisodeIndex < episodes.length) {
      const episode = episodes[currentEpisodeIndex];
      episodeRequestIdRef.current += 1;
      const requestId = episodeRequestIdRef.current;
      console.log('[PlayerPage] Episode change started:', episode.number);
      console.log(
        '[PlayerPage] Current initialTimecode:',
        initialTimecode,
        '(will be preserved)',
      );

      if (videoPlayerRef.current) {
        console.log('[PlayerPage] Clearing current player');
        videoPlayerRef.current.destroyPlayer();
      }

      setSelectedPlayer(null);
      setSelectedPlayerType('');
      playerLoadedRef.current = false;

      setSelectedEpisode(episode);

      const currentBookmark = bookmarkManager.getCurrentBookmark();
      if (currentBookmark && currentBookmark.item_id === episode.id) {
        setHasBookmark(true);
        console.log('[PlayerPage] This episode has a bookmark');
      } else {
        setHasBookmark(false);
      }

      console.log('[PlayerPage] Loading players for episode:', episode.number);
      loadEpisodePlayers(episode.id, requestId);

      console.log('[PlayerPage] Episode change completed:', episode.number);
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
      console.log(
        '[PlayerPage] Player already loaded for this episode, skipping auto-selection',
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

      console.log(
        '[PlayerPage] Auto-selecting player:',
        autoSelected.team.name,
        autoSelected.player,
      );

      if (initialTimecode !== null) {
        console.log(
          '[PlayerPage] Bookmark timecode exists, will be applied after player loads:',
          initialTimecode,
        );
      }

      setSelectedPlayer(autoSelected);

      playerLoadedRef.current = true;

      if (videoPlayerRef.current) {
        const shouldAutoplay = shouldAutoplayNextEpisodeRef.current;
        shouldAutoplayNextEpisodeRef.current = false;

        if (autoSelected.player === 'Kodik' && autoSelected.src) {
          console.log('[PlayerPage] Loading Kodik player');
          const kodikData = await loadKodikLinks(autoSelected.src);

          if (requestId !== episodeRequestIdRef.current) {
            console.log('[PlayerPage] Stale Kodik links ignored');
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
          console.log(
            '[PlayerPage] Loading non-Kodik player:',
            autoSelected.team.name,
          );
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
    console.error('[PlayerPage] VideoPlayer error:', err);
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
      console.log(
        '[PlayerPage] Player selected:',
        player.team.name,
        player.player,
      );

      const requestId = episodeRequestIdRef.current;

      setShow404(false);
      setKodikError(false);
      setSelectedPlayer(player);

      playerSelectionManager.savePreference(player.team.name, player.player);

      if (videoPlayerRef.current) {
        if (player.player === 'Kodik' && player.src) {
          console.log('[PlayerPage] Loading Kodik player');
          const kodikData = await loadKodikLinks(player.src);
          if (requestId !== episodeRequestIdRef.current) {
            console.log('[PlayerPage] Stale Kodik links ignored');
            return;
          }
          if (kodikData) {
            videoPlayerRef.current.loadPlayer(player, kodikData);
          }
        } else {
          console.log(
            '[PlayerPage] Loading non-Kodik player:',
            player.team.name,
          );
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
    console.log('[PlayerPage] Refreshing player');

    if (!selectedPlayer || !videoPlayerRef.current) {
      console.warn('[PlayerPage] Cannot refresh: no player selected');
      return;
    }

    const requestId = episodeRequestIdRef.current;

    setShow404(false);
    setKodikError(false);

    if (selectedPlayer.player === 'Kodik' && selectedPlayer.src) {
      console.log('[PlayerPage] Refreshing Kodik player');
      const kodikData = await loadKodikLinks(selectedPlayer.src);
      if (requestId !== episodeRequestIdRef.current) {
        console.log('[PlayerPage] Stale Kodik links ignored');
        return;
      }
      if (kodikData) {
        videoPlayerRef.current.loadPlayer(selectedPlayer, kodikData);
      }
    } else {
      console.log('[PlayerPage] Refreshing non-Kodik player');
      videoPlayerRef.current.loadPlayer(selectedPlayer, null);
    }
  }, [selectedPlayer, loadKodikLinks]);

  /**
   * Handle player type selection
   */
  const handlePlayerTypeSelect = useCallback((playerType: string) => {
    console.log('[PlayerPage] Switching to player type tab:', playerType);
    setSelectedPlayerType(playerType);
  }, []);

  /**
   * Handle episode selection (manual, without autoplay)
   */
  const handleEpisodeClick = useCallback(
    (episodeIndex: number) => {
      if (episodeIndex !== currentEpisodeIndex) {
        console.log(
          '[PlayerPage] Switching to episode (manual):',
          episodeIndex + 1,
        );
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
        console.log(
          '[PlayerPage] Switching to episode (from hint):',
          episodeIndex + 1,
        );
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
  const handleAutoplayChange = useCallback((enabled: boolean) => {
    setAutoplayEnabled(enabled);
    try {
      localStorage.setItem('playerAutoplayEnabled', enabled.toString());
    } catch (error) {
      console.error('[PlayerPage] Error saving autoplay setting:', error);
    }
  }, []);

  const handleAmbientLightChange = useCallback((enabled: boolean) => {
    setAmbientLightEnabled(enabled);
    try {
      localStorage.setItem('playerAmbientLightEnabled', enabled.toString());
    } catch (error) {
      console.error('[PlayerPage] Error saving ambient light setting:', error);
    }
  }, []);

  /**
   * Handle sidebar toggle
   */
  const handleSidebarToggle = useCallback(() => {
    try {
      const newState = !sidebarCollapsed;
      localStorage.setItem(sidebarStorageKey, newState.toString());
      setSidebarCollapsed(newState);
      console.log('[PlayerPage] Sidebar collapsed:', newState);
    } catch (error) {
      console.error('[PlayerPage] Error saving sidebar state:', error);
    }
  }, [sidebarCollapsed, sidebarStorageKey]);

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

    console.log(
      '[PlayerPage] Auto-saving bookmark in background:',
      currentTime,
    );

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
        console.log('[PlayerPage] Background bookmark synced:', success);
        return null;
      })
      .catch((err) => {
        persist(false);
        console.error('[PlayerPage] Error saving bookmark in background:', err);
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
            console.log('[PlayerPage] Video headers cleared');
            navigate();
            return null;
          })
          .catch((err: any) => {
            console.error('[PlayerPage] Error clearing video headers:', err);
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
      console.log('[PlayerPage] Opening related anime page:', animeUrl);

      if (!onNavigateToUrl) {
        console.warn('[PlayerPage] onNavigateToUrl not provided');
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
    console.log('[PlayerPage] Going back');
    exitPlayer(onBack);
  }, [exitPlayer, onBack]);

  /**
   * Handle URL change
   */
  const handleUrlChange = useCallback(
    (newUrl: string) => {
      console.log('[PlayerPage] URL changed:', newUrl);
      if (onNavigateToUrl) {
        onNavigateToUrl(newUrl);
      } else {
        console.warn('[PlayerPage] onNavigateToUrl not provided');
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
        console.warn('[PlayerPage] Cannot save bookmark: no animeId or player');
        return;
      }

      const episode = episodes.find((ep) => ep.id === episodeId);
      if (!episode) {
        console.warn('[PlayerPage] Cannot save bookmark: episode not found');
        return;
      }

      const meta = {
        team: selectedPlayer.team.id,
        translation_type: selectedPlayer.translation_type.id,
        player: selectedPlayer.player,
        item_number: episode.number,
      };

      console.log('[PlayerPage] Saving bookmark:', {
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
        console.log('[PlayerPage] Bookmark saved successfully');
      } else {
        console.warn('[PlayerPage] Bookmark kept locally, will sync later');
      }
    },
    [currentAnimeId, bookmarkManager, selectedPlayer, episodes],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      console.log('[PlayerPage] Component unmounting, clearing video headers');
      if ((window as any).electron?.electronAPI?.clearVideoHeaders) {
        (window as any).electron.electronAPI
          .clearVideoHeaders()
          .catch((err: any) => {
            console.error(
              '[PlayerPage] Error clearing video headers on unmount:',
              err,
            );
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
          console.log('[PlayerPage] Home button clicked');
          if (onHome) {
            onHome();
          } else {
            console.warn(
              '[PlayerPage] onHome not provided, falling back to onBack',
            );
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
        sidebarCollapsed={sidebarCollapsed}
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
                      initialTimecode={initialTimecode}
                      onTimecodeApplied={() => {
                        console.log(
                          '[PlayerPage] Timecode applied successfully, clearing...',
                        );
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
