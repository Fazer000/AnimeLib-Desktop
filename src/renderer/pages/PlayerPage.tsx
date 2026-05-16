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
import { PlayerSelectionManager, BookmarkManager } from '../services/player';

interface PlayerPageProps {
  playerUrl: string;
  animeId: string;
  onBack: () => void;
  onHome?: () => void;
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
}: PlayerPageProps) {
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const shouldAutoplayNextEpisodeRef = useRef<boolean>(false);

  // Current anime state
  const [currentAnimeId, setCurrentAnimeId] = useState<string>(animeId);

  // Episode states
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);

  // Player states
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPlayerType, setSelectedPlayerType] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [show404, setShow404] = useState<boolean>(false);
  const [kodikError, setKodikError] = useState<boolean>(false);

  // Bookmark state
  const [initialTimecode, setInitialTimecode] = useState<number | null>(null);
  const [hasBookmark, setHasBookmark] = useState<boolean>(false);
  const [bookmarkChecked, setBookmarkChecked] = useState<boolean>(false);
  const [bookmarkedEpisodeId, setBookmarkedEpisodeId] = useState<number | null>(
    null,
  );

  // Autoplay state
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

  // Related anime state
  const [relatedAnime, setRelatedAnime] = useState<RelatedAnimeType[]>([]);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('playerSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Video aspect ratio state
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  // Video playing state for ambient light - с мемоизацией для предотвращения лишних рендеров
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Update video playing state periodically - только если изменилось
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoPlayerRef.current) {
        const playing = videoPlayerRef.current.isPlaying();
        setIsVideoPlaying((prev) => {
          // Обновляем только если изменилось
          if (prev !== playing) {
            return playing;
          }
          return prev;
        });
      }
    }, 1000); // Update every 1000ms (было 500ms)

    return () => clearInterval(interval);
  }, []);

  // Ref to track if player is already loaded (prevent double loading)
  const playerLoadedRef = useRef<boolean>(false);

  // Managers
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

  // ==================== Data Loading Functions ====================

  /**
   * Load all episodes for current anime
   */
  const loadEpisodes = useCallback(async (): Promise<void> => {
    if (!currentAnimeId) return;

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
  }, [currentAnimeId]);

  /**
   * Load and process bookmark for current anime
   */
  const loadBookmark = useCallback(
    async (loadedEpisodes: Episode[]): Promise<void> => {
      if (!currentAnimeId || bookmarkManager.isProcessed()) {
        return;
      }

      try {
        const result = await bookmarkManager.loadBookmark(
          currentAnimeId,
          loadedEpisodes,
        );

        if (result.episodeIndex !== null) {
          console.log(
            '[PlayerPage] Bookmark found - episode:',
            result.episodeIndex,
            'timecode:',
            result.timecodeSeconds,
          );

          // Set BOTH episode index and timecode atomically
          // This prevents race condition where episode changes but timecode is lost
          if (result.timecodeSeconds !== null) {
            setInitialTimecode(result.timecodeSeconds);
            console.log(
              `[PlayerPage] Bookmark timecode set BEFORE episode change: ${result.timecodeSeconds}s`,
            );
          }

          setHasBookmark(true);

          // Store bookmarked episode ID for visual indicator
          const bookmarkedEpId = bookmarkManager.getBookmarkedEpisodeId();
          setBookmarkedEpisodeId(bookmarkedEpId);
          console.log('[PlayerPage] Bookmarked episode ID:', bookmarkedEpId);

          // Now change episode - this will trigger player loading
          // But initialTimecode is already set and ready
          setCurrentEpisodeIndex(result.episodeIndex);
          console.log(
            '[PlayerPage] Switching to bookmarked episode:',
            result.episodeIndex,
          );
        } else {
          console.log('[PlayerPage] No bookmark found, using first episode');
        }

        // Mark bookmark check as completed (regardless of whether bookmark exists)
        // This will unblock episode loading
        setBookmarkChecked(true);
      } catch (err) {
        console.error('[PlayerPage] Error loading bookmark:', err);
        // Even on error, mark as checked to allow episode loading
        setBookmarkChecked(true);
      }
    },
    [currentAnimeId, bookmarkManager],
  );

  /**
   * Load players for specific episode
   */
  const loadEpisodePlayers = useCallback(
    async (episodeId: number): Promise<void> => {
      setLoading(true);
      try {
        const data = await animeApi.getEpisodePlayers(episodeId);
        setPlayers(data.data.players);
        console.log('[PlayerPage] Loaded players:', data.data.players.length);
      } catch (err) {
        console.error('[PlayerPage] Error loading players:', err);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    },
    [],
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

  // ==================== Initialization ====================

  /**
   * Load related anime
   */
  const loadRelatedAnime = useCallback(async (): Promise<void> => {
    if (!currentAnimeId) return;

    try {
      const data = await animeApi.getRelatedAnime(currentAnimeId);
      setRelatedAnime(data.data);
      console.log('[PlayerPage] Loaded related anime:', data.data.length);
    } catch (err) {
      console.error('[PlayerPage] Error loading related anime:', err);
      setRelatedAnime([]);
    }
  }, [currentAnimeId]);

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

  // ==================== Episode Change Handling ====================

  /**
   * Handle episode change - complete reinitialization
   */
  useEffect(() => {
    // ⚠️ CRITICAL: Wait for bookmark check before loading first episode
    // This prevents loading episode 0 when we actually need to load bookmarked episode
    if (!bookmarkChecked) {
      console.log(
        '[PlayerPage] Waiting for bookmark check before loading episode...',
      );
      return;
    }

    if (episodes.length > 0 && currentEpisodeIndex < episodes.length) {
      const episode = episodes[currentEpisodeIndex];
      console.log('[PlayerPage] Episode change started:', episode.number);
      console.log(
        '[PlayerPage] Current initialTimecode:',
        initialTimecode,
        '(will be preserved)',
      );

      // 1. Destroy current player (but keep controller)
      if (videoPlayerRef.current) {
        console.log('[PlayerPage] Clearing current player');
        videoPlayerRef.current.destroyPlayer();
      }

      // 2. Reset player-related states (but NOT initialTimecode!)
      setSelectedPlayer(null);
      setSelectedPlayerType('');
      playerLoadedRef.current = false; // Reset loaded flag

      // 3. Set new episode
      setSelectedEpisode(episode);

      // Check if bookmark exists for this episode
      const currentBookmark = bookmarkManager.getCurrentBookmark();
      if (currentBookmark && currentBookmark.item_id === episode.id) {
        setHasBookmark(true);
        console.log('[PlayerPage] This episode has a bookmark');
      } else {
        setHasBookmark(false);
      }

      // 4. Load new episode players
      console.log('[PlayerPage] Loading players for episode:', episode.number);
      loadEpisodePlayers(episode.id);

      console.log('[PlayerPage] Episode change completed:', episode.number);
    }
    // Note: initialTimecode is NOT in deps - it should not trigger episode reload
    // Note: bookmarkChecked IS in deps - it will trigger when bookmark check completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentEpisodeIndex,
    episodes,
    loadEpisodePlayers,
    bookmarkManager,
    bookmarkChecked,
  ]);

  // ==================== Auto-Selection Logic ====================

  /**
   * Auto-select player based on saved preferences or fallback to AnimeLib/Kodik
   */
  useEffect(() => {
    if (players.length === 0) {
      return;
    }

    // Prevent double loading if player is already loaded
    if (playerLoadedRef.current) {
      console.log(
        '[PlayerPage] Player already loaded for this episode, skipping auto-selection',
      );
      return;
    }

    const selectAndLoadPlayer = async () => {
      // Use new method with fallback logic
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

      // Check if there's a bookmark timecode to apply
      if (initialTimecode !== null) {
        console.log(
          '[PlayerPage] Bookmark timecode exists, will be applied after player loads:',
          initialTimecode,
        );
      }

      // Set selected player
      setSelectedPlayer(autoSelected);

      // Mark as loaded BEFORE actually loading to prevent race conditions
      playerLoadedRef.current = true;

      // Load player in VideoPlayer
      // Note: initialTimecode will be applied by VideoPlayer's useEffect
      if (videoPlayerRef.current) {
        const shouldAutoplay = shouldAutoplayNextEpisodeRef.current;
        shouldAutoplayNextEpisodeRef.current = false; // Reset flag

        if (autoSelected.player === 'Kodik' && autoSelected.src) {
          console.log('[PlayerPage] Loading Kodik player');
          const kodikData = await loadKodikLinks(autoSelected.src);

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
    // Don't include initialTimecode in deps - it should not trigger reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, loadKodikLinks, playerSelectionManager]);

  /**
   * Auto-select player type for display
   */
  useEffect(() => {
    const groupedPlayers = PlayerSelectionManager.groupPlayersByType(players);
    if (Object.keys(groupedPlayers).length > 0) {
      const autoType = playerSelectionManager.autoSelectPlayerType(
        groupedPlayers,
        selectedPlayerType,
      );
      if (autoType && autoType !== selectedPlayerType) {
        setSelectedPlayerType(autoType);
      }
    }
  }, [players, selectedPlayerType, playerSelectionManager]);

  // ==================== Event Handlers ====================

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

      setShow404(false);
      setKodikError(false);
      setSelectedPlayer(player);

      playerSelectionManager.savePreference(player.team.name, player.player);

      if (videoPlayerRef.current) {
        if (player.player === 'Kodik' && player.src) {
          console.log('[PlayerPage] Loading Kodik player');
          const kodikData = await loadKodikLinks(player.src);
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

    setShow404(false);
    setKodikError(false);

    if (selectedPlayer.player === 'Kodik' && selectedPlayer.src) {
      console.log('[PlayerPage] Refreshing Kodik player');
      const kodikData = await loadKodikLinks(selectedPlayer.src);
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
        // Reset bookmark state when switching episodes
        setHasBookmark(false);
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
        // Reset bookmark state when switching episodes
        setHasBookmark(false);

        // Mark that this episode change is from hint (боковые кнопки)
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
      localStorage.setItem('playerSidebarCollapsed', newState.toString());
      setSidebarCollapsed(newState);
      console.log('[PlayerPage] Sidebar collapsed:', newState);
    } catch (error) {
      console.error('[PlayerPage] Error saving sidebar state:', error);
    }
  }, [sidebarCollapsed]);

  /**
   * Handle related anime click - load player for selected anime
   */
  const handleRelatedAnimeClick = useCallback(
    async (slugUrl: string, newAnimeId: number) => {
      console.log(
        '[PlayerPage] Related anime clicked:',
        slugUrl,
        'anime_id:',
        newAnimeId,
      );

      try {
        // Update current anime ID
        setCurrentAnimeId(slugUrl);

        // Reset states
        setLoading(true);
        setShow404(false);
        playerLoadedRef.current = false;

        // Load episodes for new anime (using slugUrl as animeId)
        const episodesData = await animeApi.getEpisodes(slugUrl);
        const newEpisodes = episodesData.data;

        if (!newEpisodes || newEpisodes.length === 0) {
          console.error('[PlayerPage] No episodes found for related anime');
          setLoading(false);
          return;
        }

        setEpisodes(newEpisodes);
        console.log(
          '[PlayerPage] Loaded episodes for related anime:',
          newEpisodes.length,
        );

        // Load first episode's players
        const firstEpisode = newEpisodes[0];
        const playersData = await animeApi.getEpisodePlayers(firstEpisode.id);
        const newPlayers = playersData.data.players;

        setPlayers(newPlayers);
        setSelectedEpisode(firstEpisode);
        setCurrentEpisodeIndex(0);

        // Check for bookmark
        const bookmarkResult = await bookmarkManager.loadBookmark(
          slugUrl,
          newEpisodes,
        );

        if (bookmarkResult.episodeIndex !== null) {
          setHasBookmark(true);
          setBookmarkedEpisodeId(bookmarkManager.getBookmarkedEpisodeId());
          setInitialTimecode(bookmarkResult.timecodeSeconds);

          // If bookmark is for different episode, load that episode
          if (bookmarkResult.episodeIndex !== 0) {
            const bookmarkedEpisode = newEpisodes[bookmarkResult.episodeIndex];
            const bookmarkedPlayersData = await animeApi.getEpisodePlayers(
              bookmarkedEpisode.id,
            );
            setPlayers(bookmarkedPlayersData.data.players);
            setSelectedEpisode(bookmarkedEpisode);
            setCurrentEpisodeIndex(bookmarkResult.episodeIndex);
          }
        } else {
          setHasBookmark(false);
          setBookmarkedEpisodeId(null);
          setInitialTimecode(null);
        }
        setBookmarkChecked(true);

        // Auto-select player
        const autoSelected =
          playerSelectionManager.autoSelectPlayerOrFallback(newPlayers);
        if (autoSelected) {
          setSelectedPlayer(autoSelected);
          playerLoadedRef.current = true;

          // Load player data
          if (autoSelected.player === 'Kodik' && autoSelected.src) {
            const kodikData = await loadKodikLinks(autoSelected.src);
            if (videoPlayerRef.current && kodikData) {
              await videoPlayerRef.current.loadPlayer(autoSelected, kodikData);
            }
          } else if (videoPlayerRef.current) {
            await videoPlayerRef.current.loadPlayer(autoSelected);
          }
        }

        // Load related anime for new anime
        loadRelatedAnime();

        setLoading(false);
      } catch (error) {
        console.error('[PlayerPage] Error loading related anime:', error);
        setLoading(false);
        setShow404(true);
      }
    },
    [bookmarkManager, playerSelectionManager, loadKodikLinks, loadRelatedAnime],
  );

  /**
   * Handle back navigation - with auto-save bookmark
   */
  const handleBack = useCallback(() => {
    console.log('[PlayerPage] Going back');

    // Auto-save bookmark in background (non-blocking)
    const currentEpisode = episodes[currentEpisodeIndex];
    if (
      currentEpisode &&
      videoPlayerRef.current?.videoRef.current &&
      currentAnimeId &&
      selectedPlayer
    ) {
      const currentTime =
        videoPlayerRef.current.videoRef.current.currentTime || 0;

      if (currentTime > 0) {
        console.log(
          '[PlayerPage] Auto-saving bookmark in background:',
          currentTime,
        );

        // Build meta from selectedPlayer
        const meta = {
          team: selectedPlayer.team.id,
          translation_type: selectedPlayer.translation_type.id,
          player: selectedPlayer.player,
          item_number: currentEpisode.number,
        };

        // Save bookmark in background without blocking navigation
        bookmarkManager
          .saveBookmark(currentAnimeId, currentEpisode.id, currentTime, meta)
          .then(() => {
            console.log(
              '[PlayerPage] Bookmark saved successfully in background',
            );
            return null;
          })
          .catch((err) => {
            console.error(
              '[PlayerPage] Error saving bookmark in background:',
              err,
            );
            return null;
          });
      }
    }

    const clearAndGoBack = () => {
      onBack();
    };

    // Clear video headers if available
    if ((window as any).electron?.electronAPI?.clearVideoHeaders) {
      (window as any).electron.electronAPI
        .clearVideoHeaders()
        .then(() => {
          console.log('[PlayerPage] Video headers cleared');
          clearAndGoBack();
          return null;
        })
        .catch((err: any) => {
          console.error('[PlayerPage] Error clearing video headers:', err);
          clearAndGoBack();
          return null;
        });
    } else {
      clearAndGoBack();
    }
  }, [
    onBack,
    episodes,
    currentEpisodeIndex,
    currentAnimeId,
    bookmarkManager,
    selectedPlayer,
  ]);

  /**
   * Handle URL change
   */
  const handleUrlChange = useCallback((newUrl: string) => {
    // URL is now saved in UrlBar component directly to localStorage
    // This callback is just for logging/notifications
    console.log('[PlayerPage] URL changed:', newUrl);
  }, []);

  // ==================== Window Controls ====================

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

      // Find episode to get item_number
      const episode = episodes.find((ep) => ep.id === episodeId);
      if (!episode) {
        console.warn('[PlayerPage] Cannot save bookmark: episode not found');
        return;
      }

      // Build meta from selectedPlayer
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

      if (success) {
        console.log('[PlayerPage] Bookmark saved successfully');
        setHasBookmark(true); // Mark that bookmark now exists
        // TODO: Show success notification
      } else {
        console.error('[PlayerPage] Failed to save bookmark');
        // TODO: Show error notification
      }
    },
    [currentAnimeId, bookmarkManager, selectedPlayer, episodes],
  );

  // ==================== Cleanup ====================

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

  // ==================== Render ====================

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
        height={32}
        isPlayerPage
        showUrlInput={showUrlInput}
        currentUrl={playerUrl}
        animeId={currentAnimeId}
        onUrlChange={handleUrlChange}
        onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Padding for fixed toolbar */}
      <Box
        id="player-page-scroll-container"
        sx={{
          flex: 1,
          position: 'relative',
          marginTop: '32px',
          overflow: 'auto',
        }}
      >
        {/* Player section - Fixed height container */}
        <Box
          sx={{
            height: 'calc(100vh - 32px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            isolation: 'isolate', // Create stacking context
          }}
        >
          {/* Ambient light effect - positioned absolutely to player */}
          {videoPlayerRef.current?.videoRef && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: sidebarCollapsed ? 0 : '260px',
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: videoAspectRatio ? 'fit-content' : 'calc(100% - 8px)',
                  height: videoAspectRatio
                    ? 'fit-content'
                    : 'calc(100% - 16px)',
                  maxWidth: 'calc(100% - 8px)',
                  maxHeight: 'calc(100% - 16px)',
                  aspectRatio: (() => {
                    if (videoAspectRatio) return videoAspectRatio.toFixed(4);
                    if (sidebarCollapsed) return '16 / 9';
                    return 'auto';
                  })(),
                  '@media (min-aspect-ratio: 1/1)': videoAspectRatio
                    ? {
                        height: 'calc(100% - 16px)',
                        width: 'auto',
                      }
                    : {},
                  '@media (max-aspect-ratio: 1/1)': videoAspectRatio
                    ? {
                        width: 'calc(100% - 8px)',
                        height: 'auto',
                      }
                    : {},
                  position: 'relative',
                }}
              >
                <AmbientLight
                  videoRef={videoPlayerRef.current.videoRef}
                  isPlaying={isVideoPlaying}
                  isFullscreen={false}
                  enabled={ambientLightEnabled}
                />
              </Box>
            </Box>
          )}

          {/* Main content */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Video player */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                width: 'calc(100% - 260px)',
                height: '100%',
                minHeight: '400px',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                zIndex: 0,
              }}
            >
              <Box
                sx={{
                  width: videoAspectRatio ? 'fit-content' : '100%',
                  height: videoAspectRatio ? 'fit-content' : '100%',
                  maxWidth: 'calc(100% - 8px)',
                  maxHeight: 'calc(100% - 16px)',
                  aspectRatio: (() => {
                    if (videoAspectRatio) return videoAspectRatio.toFixed(4);
                    if (sidebarCollapsed) return '16 / 9';
                    return 'auto';
                  })(),
                  // Make it grow to fill available space while respecting aspect ratio
                  '@media (min-aspect-ratio: 1/1)': videoAspectRatio
                    ? {
                        height: 'calc(100% - 16px)',
                        width: 'auto',
                      }
                    : {},
                  '@media (max-aspect-ratio: 1/1)': videoAspectRatio
                    ? {
                        width: 'calc(100% - 8px)',
                        height: 'auto',
                      }
                    : {},
                  backgroundColor: '#000',
                  position: 'relative',
                  boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
                  margin: 1,
                  marginRight: 0,
                  zIndex: 1,
                }}
              >
                <ErrorBoundary>
                  {/* 404 Error Overlay - positioned absolutely to overlay VideoPlayer */}
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
                        Не удалось получить ссылку на видео. Сервис недоступен или превышено время ожидания.
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

                  {/* VideoPlayer - Always mounted, hidden when overlay is shown */}
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
                    />
                  </Box>
                </ErrorBoundary>
              </Box>
            </Box>

            {/* Sidebar with players - higher z-index */}
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <PlayerSidebar
                players={players}
                selectedPlayer={selectedPlayer}
                selectedPlayerType={selectedPlayerType}
                loading={loading}
                onPlayerSelect={handlePlayerSelect}
                onPlayerTypeSelect={handlePlayerTypeSelect}
                hasBookmark={hasBookmark}
                isCollapsed={sidebarCollapsed}
                onSaveBookmark={() => {
                  // Get current episode and time from video player
                  const currentEpisode = episodes[currentEpisodeIndex];
                  if (
                    currentEpisode &&
                    videoPlayerRef.current?.videoRef.current
                  ) {
                    const currentTime =
                      videoPlayerRef.current.videoRef.current.currentTime || 0;
                    handleSaveBookmark(currentEpisode.id, currentTime);
                  }
                }}
              />
            </Box>
          </Box>

          {/* Episode slider */}
          <Box sx={{ position: 'relative', zIndex: 3 }}>
            <EpisodeSlider
              episodes={episodes}
              currentEpisodeIndex={currentEpisodeIndex}
              onEpisodeSelect={handleEpisodeClick}
              bookmarkedEpisodeId={bookmarkedEpisodeId}
            />
          </Box>
        </Box>

        {/* Related anime section - Below episodes, above comments */}
        {relatedAnime.length > 0 && (
          <RelatedAnime
            key={currentAnimeId}
            relatedAnime={relatedAnime}
            onAnimeClick={handleRelatedAnimeClick}
          />
        )}

        {/* Comments section - Below player, centered 70% width */}
        {selectedEpisode && (
          <CommentsSection
            episodeId={selectedEpisode.id}
            scrollContainerId="player-page-scroll-container"
          />
        )}

        {/* Scroll to top button */}
        <ScrollToTopButton
          threshold={400}
          scrollContainerId="player-page-scroll-container"
        />
      </Box>
    </Box>
  );
}

PlayerPageRefactored.defaultProps = {
  onHome: undefined,
};

export default PlayerPageRefactored;
