/* eslint-disable no-console */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { animeApi, Episode, Player, KodikVideoLinks } from '../api/animeApi';
import CustomToolbar from '../components/Toolbar';
import VideoPlayer, { VideoPlayerRef } from '../components/player/VideoPlayer';
import ErrorBoundary from '../components/player/ErrorBoundary';
import EpisodeSlider from '../components/player/EpisodeSlider';
import PlayerSidebar from '../components/player/PlayerSidebar';
import CommentsSection from '../components/player/CommentsSection';
import { PlayerSelectionManager, BookmarkManager } from '../services/player';

interface PlayerPageProps {
  playerUrl: string;
  animeId: string;
  onBack: () => void;
}

/**
 * PlayerPage - Main player page with episodes and voice team selection
 *
 * Uses OOP architecture with:
 * - PlayerSelectionManager for player selection logic
 * - EpisodeSlider component for episode navigation
 * - PlayerSidebar component for player/voice team list
 */
function PlayerPageRefactored({ playerUrl, animeId, onBack }: PlayerPageProps) {
  const theme = useTheme();
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

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

  // Bookmark state
  const [initialTimecode, setInitialTimecode] = useState<number | null>(null);
  const [hasBookmark, setHasBookmark] = useState<boolean>(false);
  const [bookmarkChecked, setBookmarkChecked] = useState<boolean>(false);
  const [bookmarkedEpisodeId, setBookmarkedEpisodeId] = useState<number | null>(
    null,
  );

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
    if (!animeId) return;

    setLoading(true);
    try {
      const data = await animeApi.getEpisodes(animeId);
      setEpisodes(data.data);
      console.log('[PlayerPage] Loaded episodes:', data.data.length);
    } catch (err) {
      console.error('[PlayerPage] Error loading episodes:', err);
    } finally {
      setLoading(false);
    }
  }, [animeId]);

  /**
   * Load and process bookmark for current anime
   */
  const loadBookmark = useCallback(
    async (loadedEpisodes: Episode[]): Promise<void> => {
      if (!animeId || bookmarkManager.isProcessed()) {
        return;
      }

      try {
        const result = await bookmarkManager.loadBookmark(
          animeId,
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
    [animeId, bookmarkManager],
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
      try {
        const data = await animeApi.getKodikVideoLinks(kodikSrc);
        console.log('[PlayerPage] Loaded Kodik links:', data.success);
        return data;
      } catch (err) {
        console.error('[PlayerPage] Error loading Kodik links:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ==================== Initialization ====================

  /**
   * Initialize episodes on mount
   */
  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

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
        if (autoSelected.player === 'Kodik' && autoSelected.src) {
          // Load Kodik links first, then load player
          console.log('[PlayerPage] Loading Kodik player');
          const kodikData = await loadKodikLinks(autoSelected.src);

          if (kodikData && kodikData.success) {
            videoPlayerRef.current.loadPlayer(autoSelected, kodikData);
          }
        } else {
          // Load non-Kodik player immediately
          console.log(
            '[PlayerPage] Loading non-Kodik player:',
            autoSelected.team.name,
          );
          videoPlayerRef.current.loadPlayer(autoSelected, null);
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

      // Reset 404 when switching voice teams
      setShow404(false);

      setSelectedPlayer(player);

      // Save user preferences
      playerSelectionManager.savePreference(player.team.name, player.player);

      // Load player in VideoPlayer
      if (videoPlayerRef.current) {
        if (player.player === 'Kodik' && player.src) {
          // Load Kodik links first, then load player
          console.log('[PlayerPage] Loading Kodik player');
          const kodikData = await loadKodikLinks(player.src);
          videoPlayerRef.current.loadPlayer(player, kodikData);
        } else {
          // Load non-Kodik player immediately
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
   * Handle player type selection
   */
  const handlePlayerTypeSelect = useCallback((playerType: string) => {
    console.log('[PlayerPage] Switching to player type tab:', playerType);
    setSelectedPlayerType(playerType);
  }, []);

  /**
   * Handle episode selection
   */
  const handleEpisodeClick = useCallback(
    (episodeIndex: number) => {
      if (episodeIndex !== currentEpisodeIndex) {
        console.log('[PlayerPage] Switching to episode:', episodeIndex + 1);
        setCurrentEpisodeIndex(episodeIndex);
        // Reset bookmark state when switching episodes
        setHasBookmark(false);
      }
    },
    [currentEpisodeIndex],
  );

  /**
   * Handle back navigation - with auto-save bookmark
   */
  const handleBack = useCallback(async () => {
    console.log('[PlayerPage] Going back');

    // Auto-save bookmark before leaving
    const currentEpisode = episodes[currentEpisodeIndex];
    if (
      currentEpisode &&
      videoPlayerRef.current?.videoRef.current &&
      animeId &&
      selectedPlayer
    ) {
      const currentTime =
        videoPlayerRef.current.videoRef.current.currentTime || 0;

      if (currentTime > 0) {
        console.log(
          '[PlayerPage] Auto-saving bookmark before exit:',
          currentTime,
        );

        // Build meta from selectedPlayer
        const meta = {
          team: selectedPlayer.team.id,
          translation_type: selectedPlayer.translation_type.id,
          player: selectedPlayer.player,
          item_number: currentEpisode.number,
        };

        await bookmarkManager.saveBookmark(
          animeId,
          currentEpisode.id,
          currentTime,
          meta,
        );
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
    animeId,
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
      if (!animeId || !selectedPlayer) {
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
        animeId,
        episodeId,
        currentTime,
        meta,
      });

      const success = await bookmarkManager.saveBookmark(
        animeId,
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
    [animeId, bookmarkManager, selectedPlayer, episodes],
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.primary.dark,
      }}
    >
      {/* Fixed Toolbar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <CustomToolbar
          onBack={handleBack}
          onHome={() => {
            const homeUrl = localStorage.getItem('animeLibUrl');
            if (homeUrl) {
              console.log('[PlayerPage] Navigating to home URL:', homeUrl);
              onBack();
            }
          }}
          canGoBack
          title={selectedEpisode ? `Эпизод ${selectedEpisode.number}` : 'Плеер'}
          backgroundColor="#252527"
          height={32}
          selectedPlayer={selectedPlayer}
          showUrlInput={showUrlInput}
          currentUrl={playerUrl}
          animeId={animeId}
          onUrlChange={handleUrlChange}
          onToggleUrlInput={() => setShowUrlInput(!showUrlInput)}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onClose={handleClose}
        />
      </Box>

      {/* Player section - 100vh with top padding for fixed toolbar */}
      <Box
        sx={{
          marginTop: '32px', // Отступ под fixed toolbar
          height: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Main content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Video player */}
          <Box
            sx={{
              flex: 1,
              backgroundColor: '#0a0a0a',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              width: 'calc(100% - 260px)',
              height: '100%',
              minHeight: '400px',
            }}
          >
            <Box
              sx={{
                width: 'calc(100% - 8px)',
                height: 'calc(100% - 16px)',
                backgroundColor: '#000',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
                margin: 1,
                marginRight: 0, // Убираем правый отступ чтобы вплотную к sidebar
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

                {/* VideoPlayer - Always mounted, hidden when 404 overlay is shown */}
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    visibility: show404 ? 'hidden' : 'visible',
                  }}
                >
                  <VideoPlayer
                    ref={videoPlayerRef}
                    onError={handleVideoError}
                    animeId={animeId}
                    episodeName={selectedEpisode ? selectedEpisode.name : ''}
                    episodes={episodes}
                    currentEpisodeIndex={currentEpisodeIndex}
                    onEpisodeSelect={handleEpisodeClick}
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
                  />
                </Box>
              </ErrorBoundary>
            </Box>
          </Box>

          {/* Sidebar with players */}
          <PlayerSidebar
            players={players}
            selectedPlayer={selectedPlayer}
            selectedPlayerType={selectedPlayerType}
            loading={loading}
            onPlayerSelect={handlePlayerSelect}
            onPlayerTypeSelect={handlePlayerTypeSelect}
            hasBookmark={hasBookmark}
            onSaveBookmark={() => {
              // Get current episode and time from video player
              const currentEpisode = episodes[currentEpisodeIndex];
              if (currentEpisode && videoPlayerRef.current?.videoRef.current) {
                const currentTime =
                  videoPlayerRef.current.videoRef.current.currentTime || 0;
                handleSaveBookmark(currentEpisode.id, currentTime);
              }
            }}
          />
        </Box>

        {/* Episode slider */}
        <EpisodeSlider
          episodes={episodes}
          currentEpisodeIndex={currentEpisodeIndex}
          onEpisodeSelect={handleEpisodeClick}
          bookmarkedEpisodeId={bookmarkedEpisodeId}
        />
      </Box>

      {/* Comments section - Below player, centered 70% width */}
      {selectedEpisode && <CommentsSection episodeId={selectedEpisode.id} />}
    </Box>
  );
}

export default PlayerPageRefactored;
