import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import {
  animeApi,
  Episode,
  RelatedAnime as RelatedAnimeType,
} from '../api/animeApi';
import CustomToolbar from '../components/Toolbar';
import VideoPlayer, { VideoPlayerRef } from '../components/player/VideoPlayer';
import ErrorBoundary from '../components/ErrorBoundary';
import EpisodeSlider from '../components/player/EpisodeSlider';
import PlayerSidebar from '../components/player/PlayerSidebar';
import CommentsSection from '../components/player/CommentsSection';
import ScrollToTopButton from '../components/player/ScrollToTopButton';
import RelatedAnime from '../components/player/RelatedAnime';
import AmbientLight from '../components/player/AmbientLight';
import DownloadManagerDialog from '../components/offline/DownloadManagerDialog';
import { PlayerSelectionManager, BookmarkManager } from '../services/player';
import { progressStore } from '../services/offline';
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
import { useEpisodeCatalog } from './player/useEpisodeCatalog';
import { useEpisodePlayers } from './player/useEpisodePlayers';

import { createLogger } from '../../shared/logger';
import {
  ACCENT,
  ACCENT_DEEP,
  BLACK_SHORT,
  SURFACE_DEEPEST,
  SURFACE_HEADER,
  TEXT_PRIMARY,
  WHITE,
  WHITE_SHORT,
} from '../theme/palette';

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

  const [currentAnimeId] = useState<string>(animeId);

  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

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

  const {
    episodes,
    currentEpisodeIndex,
    loading: episodesLoading,
    initialTimecode,
    setInitialTimecode,
    hasBookmark,
    setHasBookmark,
    bookmarkChecked,
    bookmarkedEpisodeId,
    setBookmarkedEpisodeId,
    selectEpisode,
    consumeAutoplayFlag,
  } = useEpisodeCatalog({
    animeId: currentAnimeId,
    offlineMode,
    initialEpisodeId,
    bookmarkManager,
  });

  const {
    players,
    selectedPlayer,
    selectedPlayerType,
    setSelectedPlayerType,
    loading: playersLoading,
    kodikError,
    show404,
    selectPlayer,
    refreshPlayer,
    handleVideoError,
  } = useEpisodePlayers({
    animeId: currentAnimeId,
    offlineMode,
    episode: episodes[currentEpisodeIndex] ?? null,
    ready: bookmarkChecked,
    videoPlayerRef,
    playerSelectionManager,
    consumeAutoplayFlag,
    onEpisodeApplied: useCallback(
      (episode: Episode) => {
        setSelectedEpisode(episode);

        const bookmark = bookmarkManager.getCurrentBookmark();
        setHasBookmark(Boolean(bookmark && bookmark.item_id === episode.id));
      },
      [bookmarkManager, setHasBookmark],
    ),
  });

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
    loadRelatedAnime();
  }, [loadRelatedAnime]);

  /**
   * Check and load bookmark after episodes are loaded
   */

  /**
   * Handle episode selection (manual, without autoplay)
   */
  const handleEpisodeClick = useCallback(
    (episodeIndex: number) => selectEpisode(episodeIndex),
    [selectEpisode],
  );

  /**
   * Handle episode selection with autoplay (from navigation hints)
   */
  const handleEpisodeClickWithAutoplay = useCallback(
    (episodeIndex: number) => selectEpisode(episodeIndex, true),
    [selectEpisode],
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

      if (window.electron?.electronAPI?.clearVideoHeaders) {
        window.electron.electronAPI
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
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.sendMessage('window-minimize');
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.sendMessage('window-maximize');
    }
  }, []);

  const handleClose = useCallback(() => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.sendMessage('window-close');
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
    [
      currentAnimeId,
      bookmarkManager,
      selectedPlayer,
      episodes,
      setHasBookmark,
      setBookmarkedEpisodeId,
    ],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      log.debug('Component unmounting, clearing video headers');
      if (window.electron?.electronAPI?.clearVideoHeaders) {
        window.electron.electronAPI.clearVideoHeaders().catch((err: any) => {
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
        backgroundColor: SURFACE_DEEPEST,
        overflow: 'hidden',
      }}
    >
      <CustomToolbar
        onBack={handleBack}
        onRefresh={refreshPlayer}
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
        backgroundColor={SURFACE_HEADER}
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
                <ErrorBoundary title="Произошла ошибка в плеере">
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
                        backgroundColor: BLACK_SHORT,
                        color: WHITE,
                        textAlign: 'center',
                        zIndex: 10,
                      }}
                    >
                      <Typography
                        variant="h1"
                        sx={{
                          fontSize: '120px',
                          fontWeight: 'bold',
                          color: ACCENT,
                        }}
                      >
                        404
                      </Typography>
                      <Typography
                        variant="h4"
                        color={TEXT_PRIMARY}
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
                        backgroundColor: BLACK_SHORT,
                        color: WHITE,
                        textAlign: 'center',
                        zIndex: 10,
                        gap: 2,
                      }}
                    >
                      <Typography
                        variant="h4"
                        sx={{ color: ACCENT, fontWeight: 'bold' }}
                      >
                        Ошибка Kodik
                      </Typography>
                      <Typography variant="body1" color={TEXT_PRIMARY}>
                        Не удалось получить ссылку на видео. Сервис недоступен
                        или превышено время ожидания.
                      </Typography>
                      <Box
                        component="button"
                        onClick={refreshPlayer}
                        sx={{
                          mt: 1,
                          px: 3,
                          py: 1,
                          backgroundColor: ACCENT,
                          color: WHITE_SHORT,
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: ACCENT_DEEP },
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
                loading={episodesLoading || playersLoading}
                onPlayerSelect={selectPlayer}
                onPlayerTypeSelect={setSelectedPlayerType}
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
