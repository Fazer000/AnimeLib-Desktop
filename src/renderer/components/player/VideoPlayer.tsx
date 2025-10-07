/* eslint-disable no-console */
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import 'shaka-player/dist/controls.css';
import { Box, Typography, CircularProgress } from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';
import {
  Player,
  KodikVideoLinks,
  AnimeInfo,
  animeApi,
} from '../../api/animeApi';
import VideoControls from './VideoControls';
import AnimeInfoComponent from './AnimeInfo';
import EpisodeNavigationHint from './EpisodeNavigationHint';
import {
  SkipManager,
  VideoPlayerController,
  VideoState,
  QualityOption,
} from '../../services/player';

interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

interface VideoPlayerProps {
  onError: (error: string) => void;
  animeId: string;
  episodeName: string;
  episodes: Array<{ id: number; number: string; name: string }>;
  currentEpisodeIndex: number;
  onEpisodeSelect: (index: number) => void;
  // eslint-disable-next-line react/require-default-props
  initialTimecode?: number | null; // Таймкод для установки после загрузки видео
  // eslint-disable-next-line react/require-default-props
  onTimecodeApplied?: () => void; // Callback когда таймкод применен
  // eslint-disable-next-line react/require-default-props
  onSaveBookmark?: (episodeId: number, currentTime: number) => void; // Callback для сохранения закладки
  // eslint-disable-next-line react/require-default-props
  hasBookmark?: boolean; // Есть ли сохраненная закладка для текущего эпизода
  // eslint-disable-next-line react/require-default-props
  bookmarkedEpisodeId?: number | null; // ID эпизода с закладкой для визуального индикатора
  // eslint-disable-next-line react/require-default-props
  autoplayEnabled?: boolean; // Включено ли автопроизведение
  // eslint-disable-next-line react/require-default-props
  onAutoplayChange?: (enabled: boolean) => void; // Callback для изменения настройки автопроизведения
  // eslint-disable-next-line react/require-default-props
  selectedPlayer?: {
    id: number;
    player: string;
    team: {
      name: string;
    };
  } | null; // Выбранная озвучка
  // eslint-disable-next-line react/require-default-props
  timecode?: TimeCode[]; // Сегменты для пропуска (опенинг, эндинг)
}

interface VideoPlayerRef {
  loadPlayer: (player: Player, kodikLinks?: KodikVideoLinks | null) => void;
  clearPlayer: () => void;
  destroyPlayer: () => void;
  seekTo: (time: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * VideoPlayer с ООП-архитектурой
 * Использует классы для управления различными аспектами плеера
 */
const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  (
    {
      onError,
      animeId,
      episodeName,
      episodes,
      currentEpisodeIndex,
      onEpisodeSelect,
      initialTimecode = null,
      onTimecodeApplied,
      onSaveBookmark,
      hasBookmark = false,
      bookmarkedEpisodeId = null,
      autoplayEnabled = false,
      onAutoplayChange,
      selectedPlayer = null,
      timecode = [],
    },
    ref,
  ) => {
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<VideoPlayerController | null>(null);
    const pendingLoadRef = useRef<{
      player: Player;
      kodikLinks?: KodikVideoLinks | null;
    } | null>(null);

    // UI states
    const [isControllerReady, setIsControllerReady] = useState<boolean>(false);
    const [currentPlayerData, setCurrentPlayerData] = useState<Player | null>(
      null,
    );
    const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);

    // Video state from controller
    const [videoState, setVideoState] = useState<VideoState>({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: 1,
      isMuted: false,
      playbackRate: 1,
      isBuffering: false,
    });

    // Quality state from controller
    const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
    const [selectedQuality, setSelectedQuality] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // UI control states
    const [showControls, setShowControls] = useState<boolean>(true);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [showCenterIcon, setShowCenterIcon] = useState<boolean>(false);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

    // Bookmark timecode state
    const timecodeAppliedRef = useRef<boolean>(false);

    // Autoplay state - track if this is the first load
    const isFirstLoadRef = useRef<boolean>(true);

    // Skip Manager
    const [skipManager] = useState(() => new SkipManager());
    const [skipTime, setSkipTime] = useState(skipManager.getSkipTime());

    // Timecode segments
    const [currentSegment, setCurrentSegment] = useState<TimeCode | null>(null);

    // Episodes list visibility (for fullscreen)
    const [showEpisodesList, setShowEpisodesList] = useState<boolean>(false);

    // Auto skip settings
    const [autoSkipSettings, setAutoSkipSettings] = useState(() => {
      const stored = localStorage.getItem('autoSkipSettings');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return {
            skipOpenings: false,
            skipEndings: false,
            skipCompilations: false,
            skipSplashScreens: false,
          };
        }
      }
      return {
        skipOpenings: false,
        skipEndings: false,
        skipCompilations: false,
        skipSplashScreens: false,
      };
    });

    // Initialize controller
    useEffect(() => {
      const initController = async () => {
        if (!videoRef.current || !containerRef.current) {
          console.error('[VideoPlayer] Video or container ref not ready');
          return;
        }

        console.log('[VideoPlayer] Initializing controller...');

        // Get initial skipTime from storage
        const initialSkipTime = skipManager.getSkipTime();
        console.log(
          '[VideoPlayer] Initial skip time from storage:',
          initialSkipTime,
        );

        const controller = new VideoPlayerController({
          onError,
          onLoadingChange: setIsLoading,
          onStateChange: (updates) => {
            setVideoState((prev) => ({ ...prev, ...updates }));
          },
          onQualityOptionsChange: setQualityOptions,
          onSelectedQualityChange: setSelectedQuality,
          onKeyPress: () => {
            // Show controls when hotkey is pressed
            setShowControls(true);
          },
          onSkipForward: (seconds: number) => {
            // Handle custom skip forward
            controllerRef.current?.getStateManager().skip(seconds);
          },
          skipTime: initialSkipTime, // Load from localStorage
          onToggleEpisodes: () => {
            // Toggle episodes list
            setShowEpisodesList((prev) => !prev);
            setShowControls(true); // Show controls when episodes list is toggled
          },
        });

        const success = await controller.initialize(
          videoRef.current,
          containerRef.current,
        );

        if (success) {
          controllerRef.current = controller;
          setIsControllerReady(true);
          console.log('[VideoPlayer] Controller initialized successfully');
        } else {
          console.error('[VideoPlayer] Controller initialization failed');
          setIsControllerReady(false);
        }
      };

      initController();

      return () => {
        if (controllerRef.current) {
          controllerRef.current.destroy();
          controllerRef.current = null;
        }
        setIsControllerReady(false);
      };
    }, [onError, skipManager]);

    // Update skipTime in KeyboardManager when it changes
    useEffect(() => {
      if (controllerRef.current) {
        // Update the skipTime in KeyboardManager config
        const keyboardManager = controllerRef.current.getKeyboardManager();
        if (keyboardManager) {
          keyboardManager.updateConfig({ skipTime });
        }
      }
    }, [skipTime]);

    // Process pending load when controller becomes ready
    useEffect(() => {
      if (
        isControllerReady &&
        pendingLoadRef.current &&
        controllerRef.current
      ) {
        const { player, kodikLinks } = pendingLoadRef.current;
        pendingLoadRef.current = null;

        console.log(
          '[VideoPlayer] Processing pending load:',
          player.team.name,
          player.player,
        );

        setCurrentPlayerData(player);

        controllerRef.current
          .loadPlayer({
            player,
            kodikLinks: kodikLinks || null,
          })
          .catch((error) => {
            console.error('[VideoPlayer] Error in pending load:', error);
          });
      }
    }, [isControllerReady]);

    // Setup video headers when player changes
    useEffect(() => {
      if (!currentPlayerData) return;

      const setupHeaders = async () => {
        const rawSiteUrl = localStorage.getItem('animeLibUrl');
        const siteUrl = new URL(rawSiteUrl || 'https://v3.animelib.org').origin;
        const bearerToken = localStorage.getItem('animeLibAuthToken');

        let authToken: string | undefined;
        if (bearerToken) {
          try {
            const tokenData = JSON.parse(bearerToken);
            if (tokenData.access_token) {
              authToken = tokenData.access_token;
            }
          } catch (error) {
            console.error('[VideoPlayer] Error parsing auth token:', error);
          }
        }

        if (window.electron?.electronAPI?.setupVideoHeaders) {
          try {
            await window.electron.electronAPI.setupVideoHeaders(
              siteUrl,
              authToken,
            );
            console.log('[VideoPlayer] Video headers setup complete');
          } catch (error) {
            console.error(
              '[VideoPlayer] Error setting up video headers:',
              error,
            );
          }
        }
      };

      setupHeaders();
    }, [currentPlayerData]);

    // Load anime info
    useEffect(() => {
      if (animeId) {
        const loadAnimeInfo = async () => {
          try {
            const response = await animeApi.getAnimeInfo(animeId);
            setAnimeInfo(response.data);
          } catch (error) {
            console.error('[VideoPlayer] Failed to load anime info:', error);
          }
        };

        loadAnimeInfo();
      }
    }, [animeId]);

    // Timecode is now applied directly in loadPlayer via controller
    // This useEffect is removed to avoid conflicts with ShakaPlayerManager's waitForCanPlay

    // Reset timecode applied flag when player changes
    useEffect(() => {
      timecodeAppliedRef.current = false;
    }, [currentPlayerData]);

    // Autoplay after player loads (except first time)
    useEffect(() => {
      const video = videoRef.current;

      if (!video || !currentPlayerData) {
        return undefined;
      }

      console.log(
        '[VideoPlayer] Player loaded, isFirstLoad:',
        isFirstLoadRef.current,
        'initialTimecode:',
        initialTimecode,
      );

      // Skip autoplay on first load
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        console.log('[VideoPlayer] First load - skipping autoplay');
        return undefined;
      }

      // Skip autoplay if we have a bookmark timecode to apply
      if (initialTimecode !== null && !timecodeAppliedRef.current) {
        console.log(
          '[VideoPlayer] Bookmark timecode pending - skipping autoplay, will play after timecode applied',
        );
        return undefined;
      }

      // For subsequent loads, autoplay when video is ready
      const handleCanPlayForAutoplay = () => {
        console.log('[VideoPlayer] Video ready - starting autoplay');

        // Small delay to ensure video is fully ready
        setTimeout(() => {
          if (video && !video.paused) {
            console.log('[VideoPlayer] Video already playing');
            return;
          }

          video
            .play()
            .then(() => {
              console.log('[VideoPlayer] Autoplay started successfully');
              return null;
            })
            .catch((error) => {
              console.warn('[VideoPlayer] Autoplay failed:', error);
              // Autoplay может быть заблокирован браузером
              return null;
            });
        }, 300);
      };

      video.addEventListener('canplay', handleCanPlayForAutoplay);

      // eslint-disable-next-line consistent-return
      return () => {
        video.removeEventListener('canplay', handleCanPlayForAutoplay);
      };
    }, [currentPlayerData, initialTimecode]);

    // Auto-advance to next episode when video ends (if autoplay enabled)
    useEffect(() => {
      const video = videoRef.current;

      if (!video || !autoplayEnabled) {
        return undefined;
      }

      const handleVideoEnded = () => {
        console.log(
          '[VideoPlayer] Video ended, autoplay enabled, checking for next episode',
        );

        const hasNextEpisode = currentEpisodeIndex < episodes.length - 1;

        if (hasNextEpisode) {
          console.log(
            '[VideoPlayer] Auto-advancing to next episode:',
            currentEpisodeIndex + 1,
          );
          onEpisodeSelect(currentEpisodeIndex + 1);
        } else {
          console.log('[VideoPlayer] No more episodes to auto-advance to');
        }
      };

      video.addEventListener('ended', handleVideoEnded);

      return () => {
        video.removeEventListener('ended', handleVideoEnded);
      };
    }, [
      autoplayEnabled,
      currentEpisodeIndex,
      episodes.length,
      onEpisodeSelect,
    ]);

    // Fullscreen change handler
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () =>
        document.removeEventListener(
          'fullscreenchange',
          handleFullscreenChange,
        );
    }, []);

    // Check for active segment based on current time
    useEffect(() => {
      if (!timecode || timecode.length === 0) {
        setCurrentSegment(null);
        return;
      }

      const { currentTime } = videoState;
      const activeSegment = timecode.find(
        (segment) => currentTime >= segment.from && currentTime <= segment.to,
      );

      setCurrentSegment(activeSegment || null);
    }, [videoState, timecode]);

    // Auto-hide controls
    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout> | undefined;

      if (videoState.isPlaying && showControls && !isMenuOpen) {
        timeout = setTimeout(() => {
          console.log('[VideoPlayer] Hiding controls after timeout');
          setShowControls(false);
        }, 4000);
      }

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    }, [videoState.isPlaying, showControls, isMenuOpen]);

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        loadPlayer: async (
          player: Player,
          kodikLinks?: KodikVideoLinks | null,
        ) => {
          if (!controllerRef.current || !isControllerReady) {
            console.log(
              '[VideoPlayer] Controller not ready yet, queueing load:',
              player.team.name,
            );
            pendingLoadRef.current = { player, kodikLinks };
            return;
          }

          console.log(
            '[VideoPlayer] Loading player:',
            player.team.name,
            player.player,
          );

          setCurrentPlayerData(player);

          // Load player with timecode if available
          await controllerRef.current.loadPlayer({
            player,
            kodikLinks: kodikLinks || null,
            initialTimecode: initialTimecode || undefined,
          });

          // Mark timecode as applied if it was provided
          if (initialTimecode !== null) {
            timecodeAppliedRef.current = true;
            console.log(
              `[VideoPlayer] Timecode ${initialTimecode}s will be applied by controller`,
            );
            // Notify parent immediately
            if (onTimecodeApplied) {
              onTimecodeApplied();
            }
          }
        },

        clearPlayer: () => {
          console.log('[VideoPlayer] Clearing player');
          controllerRef.current?.clearPlayer();
          setCurrentPlayerData(null);
          pendingLoadRef.current = null;
        },

        destroyPlayer: async () => {
          console.log(
            '[VideoPlayer] Destroying player (but keeping controller)',
          );
          // Don't destroy controller on episode change, just clear the player
          controllerRef.current?.clearPlayer();
          setCurrentPlayerData(null);
          pendingLoadRef.current = null;
          // Controller stays ready for next load
        },

        seekTo: (time: number) => {
          console.log('[VideoPlayer] Seeking to time:', time);
          controllerRef.current?.seekTo(time);
        },

        videoRef,
      }),
      [isControllerReady, initialTimecode, onTimecodeApplied],
    );

    // Control handlers
    const handleTogglePlay = useCallback(() => {
      controllerRef.current?.getStateManager().togglePlay();
    }, []);

    const handleVolumeChange = useCallback((vol: number) => {
      controllerRef.current?.getStateManager().setVolume(vol);
    }, []);

    const handleToggleMute = useCallback(() => {
      controllerRef.current?.getStateManager().toggleMute();
    }, []);

    const handleToggleFullscreen = useCallback(async () => {
      await controllerRef.current?.toggleFullscreen();
    }, []);

    const handleTogglePictureInPicture = useCallback(async () => {
      await controllerRef.current?.togglePictureInPicture();
    }, []);

    const handlePlaybackRateChange = useCallback((rate: number) => {
      controllerRef.current?.getStateManager().setPlaybackRate(rate);
    }, []);

    const handleQualityChange = useCallback(async (quality: string) => {
      console.log('[VideoPlayer] Quality changed to:', quality);
      await controllerRef.current?.changeQuality(quality);
    }, []);

    const handleSkipForward = useCallback((seconds: number) => {
      controllerRef.current?.getStateManager().skip(seconds);
    }, []);

    const handleProgressMouseMove = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (videoState.duration > 0) {
          const rect = event.currentTarget.getBoundingClientRect();
          const percent = (event.clientX - rect.left) / rect.width;
          const time = percent * videoState.duration;
          setHoverTime(time);
        }
      },
      [videoState.duration],
    );

    const handleProgressMouseLeave = useCallback(() => {
      setHoverTime(null);
    }, []);

    const handleSeek = useCallback((time: number) => {
      controllerRef.current?.seekTo(time);
    }, []);

    const handleSaveBookmark = useCallback(() => {
      if (!onSaveBookmark || episodes.length === 0) {
        return;
      }

      const currentEpisode = episodes[currentEpisodeIndex];
      if (!currentEpisode) {
        console.warn('[VideoPlayer] Cannot save bookmark: no current episode');
        return;
      }

      const { currentTime } = videoState;

      console.log('[VideoPlayer] Saving bookmark:', {
        episodeId: currentEpisode.id,
        episodeName: currentEpisode.name,
        currentTime,
      });

      onSaveBookmark(currentEpisode.id, currentTime);
    }, [onSaveBookmark, episodes, currentEpisodeIndex, videoState]);

    const handlePlayerClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => {
        const target = event.target as HTMLElement;
        if (
          target.closest('.player-controls') ||
          target.closest('.video-controls')
        ) {
          return;
        }

        if (!videoState.isPlaying) {
          setShowCenterIcon(true);
          setTimeout(() => setShowCenterIcon(false), 1000);
        }

        handleTogglePlay();
      },
      [videoState.isPlaying, handleTogglePlay],
    );

    const handlePlayerDoubleClick = useCallback(
      async (event: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => {
        const target = event.target as HTMLElement;
        if (
          target.closest('.player-controls') ||
          target.closest('.video-controls')
        ) {
          return;
        }

        await handleToggleFullscreen();
      },
      [handleToggleFullscreen],
    );

    const handleSkipSegment = useCallback(() => {
      if (!currentSegment) return;

      console.log(`[VideoPlayer] Skipping ${currentSegment.type} segment`);
      handleSeek(currentSegment.to + 1);
    }, [currentSegment, handleSeek]);

    const handleAutoSkipChange = useCallback(
      (settings: {
        skipOpenings: boolean;
        skipEndings: boolean;
        skipCompilations: boolean;
        skipSplashScreens: boolean;
      }) => {
        setAutoSkipSettings(settings);
        localStorage.setItem('autoSkipSettings', JSON.stringify(settings));
        console.log('[VideoPlayer] Auto skip settings updated:', settings);
      },
      [],
    );

    // Auto skip logic
    useEffect(() => {
      if (!currentSegment) return;

      const shouldSkip =
        (currentSegment.type === 'opening' && autoSkipSettings.skipOpenings) ||
        (currentSegment.type === 'ending' && autoSkipSettings.skipEndings) ||
        (currentSegment.type === 'compilation' &&
          autoSkipSettings.skipCompilations) ||
        (currentSegment.type === 'splashScreen' &&
          autoSkipSettings.skipSplashScreens);

      if (shouldSkip) {
        console.log(
          `[VideoPlayer] Auto-skipping ${currentSegment.type} segment`,
        );
        handleSeek(currentSegment.to + 1);
      }
    }, [currentSegment, autoSkipSettings, handleSeek]);

    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minWidth: '400px',
          minHeight: '300px',
          backgroundColor: '#1c1c1c',
          overflow: 'hidden',
          cursor: showControls ? 'default' : 'none',
          '&:hover': {
            '& .player-controls': {
              opacity: 1,
            },
          },
        }}
        onMouseMove={() => {
          if (!showControls) {
            setShowControls(true);
          }
        }}
        onClick={handlePlayerClick}
        onDoubleClick={handlePlayerDoubleClick}
      >
        {/* Информация об аниме */}
        <AnimeInfoComponent
          animeInfo={animeInfo}
          show={showControls}
          episodeName={episodeName || ''}
          episodeNumber={
            episodes[currentEpisodeIndex]
              ? parseInt(episodes[currentEpisodeIndex].number, 10)
              : 0
          }
          selectedPlayer={selectedPlayer || null}
        />

        {/* Video element */}
        <video
          ref={videoRef}
          preload="metadata"
          width="100%"
          height="100%"
          crossOrigin="anonymous"
          playsInline
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            visibility: 'visible',
            backgroundColor: '#000',
            cursor: 'inherit',
          }}
          onClick={handlePlayerClick}
          onDoubleClick={handlePlayerDoubleClick}
        >
          <track kind="captions" />
        </video>

        {/* Empty state overlay */}
        {!currentPlayerData && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0a0a0a',
              zIndex: 999,
              cursor: 'inherit',
            }}
          >
            <Typography
              variant="h6"
              color="theme.palette.customColors.dtTextSecondary"
              sx={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              Выберите озвучку для воспроизведения
            </Typography>
          </Box>
        )}

        {/* Loading indicator */}
        {(isLoading || videoState.isBuffering) && currentPlayerData && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(28, 28, 28, 0.7)',
              zIndex: 1000,
              backdropFilter: 'blur(2px)',
              cursor: 'inherit',
            }}
          >
            <CircularProgress color="secondary" size={50} />
          </Box>
        )}

        {/* Center play/pause icon */}
        {showCenterIcon && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001,
              cursor: 'inherit',
              animation: 'centerIconAnimation 1.2s ease-out',
              '@keyframes centerIconAnimation': {
                '0%': {
                  opacity: 0,
                  transform: 'translate(-50%, -50%) scale(0.3)',
                },
                '15%': {
                  opacity: 1,
                  transform: 'translate(-50%, -50%) scale(1.15)',
                },
                '30%': {
                  transform: 'translate(-50%, -50%) scale(1)',
                },
                '85%': {
                  opacity: 1,
                  transform: 'translate(-50%, -50%) scale(1)',
                },
                '100%': {
                  opacity: 0,
                  transform: 'translate(-50%, -50%) scale(0.8)',
                },
              },
            }}
          >
            <Box
              sx={{
                width: 90,
                height: 90,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {videoState.isPlaying ? (
                <Pause
                  sx={{
                    fontSize: 62,
                    color: 'white',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  }}
                />
              ) : (
                <PlayArrow
                  sx={{
                    fontSize: 62,
                    color: 'white',
                    marginLeft: '4px',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Episode Navigation Hints */}
        <EpisodeNavigationHint
          currentEpisodeIndex={currentEpisodeIndex}
          totalEpisodes={episodes.length}
          onEpisodeSelect={onEpisodeSelect}
          showControls={showControls}
          episodes={episodes}
        />

        {/* Custom controls */}
        {showControls && (
          <VideoControls
            isPlaying={videoState.isPlaying}
            isLoading={isLoading}
            currentTime={videoState.currentTime}
            duration={videoState.duration}
            volume={videoState.volume}
            isMuted={videoState.isMuted}
            buffered={videoState.buffered}
            isFullscreen={isFullscreen}
            showControls={showControls}
            onMenuOpenChange={setIsMenuOpen}
            onSaveBookmark={handleSaveBookmark}
            hasBookmark={hasBookmark}
            qualityOptions={qualityOptions}
            selectedQuality={selectedQuality}
            playbackRate={videoState.playbackRate}
            onTogglePlay={handleTogglePlay}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onToggleFullscreen={handleToggleFullscreen}
            onTogglePictureInPicture={handleTogglePictureInPicture}
            onQualityChange={handleQualityChange}
            onPlaybackRateChange={handlePlaybackRateChange}
            onSkipForward={handleSkipForward}
            onSkipTimeChange={setSkipTime}
            episodes={episodes}
            currentEpisodeIndex={currentEpisodeIndex}
            onEpisodeSelect={onEpisodeSelect}
            bookmarkedEpisodeId={bookmarkedEpisodeId}
            autoplayEnabled={autoplayEnabled}
            onAutoplayChange={onAutoplayChange}
            timecode={timecode}
            currentSegment={currentSegment}
            onSkipSegment={handleSkipSegment}
            showEpisodes={showEpisodesList}
            onShowEpisodesChange={setShowEpisodesList}
            autoSkipSettings={autoSkipSettings}
            onAutoSkipChange={handleAutoSkipChange}
            onMouseMove={() => {
              if (!showControls) {
                setShowControls(true);
              }
            }}
            onMouseLeave={() => {
              // Auto-hide will handle this
            }}
            onProgressMouseMove={handleProgressMouseMove}
            onProgressMouseLeave={handleProgressMouseLeave}
            onSeek={handleSeek}
            hoverTime={hoverTime}
          />
        )}
      </Box>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export default React.memo(VideoPlayer);
export type { VideoPlayerRef };
