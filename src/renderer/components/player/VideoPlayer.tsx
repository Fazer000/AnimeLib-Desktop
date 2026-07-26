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
import NextEpisodeNotification from './NextEpisodeNotification';
import {
  SkipManager,
  VideoPlayerController,
  VideoState,
  QualityOption,
  UIStateManager,
  UIState,
  AutoplayManager,
  SegmentManager,
  TimeCodeSegment,
} from '../../services/player';
import { PLAYER_BORDER_RADIUS } from '../../../constants';

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
  onEpisodeSelectWithAutoplay?: (index: number) => void;
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
  // eslint-disable-next-line react/require-default-props
  sidebarCollapsed?: boolean; // Состояние сайдбара
  // eslint-disable-next-line react/require-default-props
  onSidebarToggle?: () => void; // Callback для переключения сайдбара
  // eslint-disable-next-line react/require-default-props
  onAspectRatioChange?: (aspectRatio: number | null) => void; // Callback при изменении aspect ratio
  // eslint-disable-next-line react/require-default-props
  ambientLightEnabled?: boolean;
  // eslint-disable-next-line react/require-default-props
  onAmbientLightChange?: (enabled: boolean) => void;
}

interface VideoPlayerRef {
  loadPlayer: (
    player: Player,
    kodikLinks?: KodikVideoLinks | null,
    isFromHint?: boolean,
  ) => void;
  clearPlayer: () => void;
  destroyPlayer: () => void;
  seekTo: (time: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: () => boolean;
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
      onEpisodeSelectWithAutoplay,
      initialTimecode = null,
      onTimecodeApplied,
      onSaveBookmark,
      hasBookmark = false,
      bookmarkedEpisodeId = null,
      autoplayEnabled = false,
      onAutoplayChange,
      selectedPlayer = null,
      timecode = [],
      sidebarCollapsed = false,
      onSidebarToggle,
      onAspectRatioChange,
      ambientLightEnabled = true,
      onAmbientLightChange,
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
    const isPlayingRef = useRef<boolean>(false);

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

    // UI State Manager
    const [uiState, setUIState] = useState<UIState>({
      showControls: true,
      isFullscreen: false,
      showCenterIcon: false,
      hoverTime: null,
      isMenuOpen: false,
      showEpisodesList: false,
    });
    const [uiStateManager] = useState(
      () =>
        new UIStateManager({
          onStateChange: (state) => setUIState(state),
        }),
    );

    // Video aspect ratio state (not used internally, only passed to parent)
    const videoAspectRatioRef = useRef<number | null>(null);

    // Autoplay Manager
    const [autoplayManager] = useState(
      () =>
        new AutoplayManager({
          enabled: autoplayEnabled,
          onEpisodeChange: onEpisodeSelect,
        }),
    );

    // Segment Manager
    const [currentSegment, setCurrentSegment] = useState<TimeCode | null>(null);
    const [segmentManager] = useState(
      () =>
        new SegmentManager({
          onSegmentChange: (segment) => setCurrentSegment(segment),
          onSkipSegment: (time) => controllerRef.current?.seekTo(time),
        }),
    );

    // Bookmark timecode state
    const timecodeAppliedRef = useRef<boolean>(false);

    // Skip Manager
    const [skipManager] = useState(() => new SkipManager());
    const [skipTime, setSkipTime] = useState(skipManager.getSkipTime());

    // Next episode notification
    const [showNextEpisodeNotification, setShowNextEpisodeNotification] =
      useState(false);
    const nextEpisodeNotificationShownRef = useRef(false);
    const nextEpisodeCancelledRef = useRef(false);

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
            uiStateManager.showPlayerControls();
            uiStateManager.startAutoHide(isPlayingRef.current);
          },
          onSkipForward: (seconds: number) => {
            // Handle custom skip forward
            controllerRef.current?.getStateManager().skip(seconds);
          },
          skipTime: initialSkipTime, // Load from localStorage
          onToggleEpisodes: () => {
            // Toggle episodes list
            uiStateManager.toggleEpisodesList();
          },
          autoplayManager,
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
        // Cleanup managers
        uiStateManager.destroy();
        autoplayManager.destroy();
        segmentManager.destroy();

        if (controllerRef.current) {
          controllerRef.current.destroy();
          controllerRef.current = null;
        }
        setIsControllerReady(false);
      };
    }, [onError, skipManager, uiStateManager, autoplayManager, segmentManager]);

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

    // Video headers are now set up directly inside loadPlayer() before video load
    // to avoid race condition where video request fires before headers are ready

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

    // Setup autoplay when player loads
    useEffect(() => {
      const video = videoRef.current;

      if (!video || !currentPlayerData) {
        return;
      }

      autoplayManager.attachVideo(video);
      autoplayManager.setBookmarkPending(
        initialTimecode !== null && !timecodeAppliedRef.current,
      );
      autoplayManager.setupAutoplayOnLoad();
    }, [currentPlayerData, initialTimecode, autoplayManager]);

    // Detect video aspect ratio
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return undefined;

      const handleLoadedMetadata = () => {
        const { videoWidth, videoHeight, duration } = video;
        if (videoWidth && videoHeight) {
          const aspectRatio = videoWidth / videoHeight;
          console.log('[VideoPlayer] Video aspect ratio:', aspectRatio, {
            width: videoWidth,
            height: videoHeight,
          });
          videoAspectRatioRef.current = aspectRatio;
          onAspectRatioChange?.(aspectRatio);
        } else {
          videoAspectRatioRef.current = null;
          onAspectRatioChange?.(null);
        }

        if (duration && duration > 0) {
          const thumbnailManager = controllerRef.current?.getThumbnailManager();
          thumbnailManager?.startPreCaching(duration);
        }
      };

      // Check if metadata is already loaded
      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }, [currentPlayerData, onAspectRatioChange]);

    // Setup auto-advance to next episode
    useEffect(() => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      // AutoplayManager всегда отключён — диалог управляет переходом
      autoplayManager.updateConfig({ enabled: false });
      autoplayManager.setupAutoAdvance(currentEpisodeIndex, episodes.length);
    }, [
      autoplayEnabled,
      currentEpisodeIndex,
      episodes.length,
      autoplayManager,
    ]);

    // Show next episode notification after video ends (ONLY if autoplay is ENABLED)
    useEffect(() => {
      const video = videoRef.current;

      if (!video || !autoplayEnabled) {
        return undefined;
      }

      const hasNextEpisode = currentEpisodeIndex < episodes.length - 1;
      if (!hasNextEpisode) {
        return undefined;
      }

      const handleVideoEnded = () => {
        // Показываем уведомление только если уже не показали
        if (!nextEpisodeNotificationShownRef.current) {
          console.log(
            '[VideoPlayer] Video ended with autoplay disabled, showing next episode notification',
          );
          setShowNextEpisodeNotification(true);
          nextEpisodeNotificationShownRef.current = true;
        }
      };

      video.addEventListener('ended', handleVideoEnded);

      return () => {
        video.removeEventListener('ended', handleVideoEnded);
      };
    }, [autoplayEnabled, currentEpisodeIndex, episodes.length]);

    // Reset notification flag when episode changes
    useEffect(() => {
      nextEpisodeNotificationShownRef.current = false;
      nextEpisodeCancelledRef.current = false;
      setShowNextEpisodeNotification(false);
    }, [currentEpisodeIndex]);

    // Fullscreen change handler - отслеживаем DOM fullscreen ПЛЕЕРА
    useEffect(() => {
      const handleFullscreenChange = () => {
        const isFullscreen = !!document.fullscreenElement;
        uiStateManager.setFullscreen(isFullscreen);
        console.log('[VideoPlayer] Player fullscreen changed:', isFullscreen);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () =>
        document.removeEventListener(
          'fullscreenchange',
          handleFullscreenChange,
        );
    }, [uiStateManager]);

    // Setup segments
    useEffect(() => {
      segmentManager.setSegments(timecode as TimeCodeSegment[]);
    }, [timecode, segmentManager]);

    // Update duration in segment manager
    useEffect(() => {
      segmentManager.setDuration(videoState.duration);
    }, [videoState.duration, segmentManager]);

    // Update segments based on current time
    useEffect(() => {
      segmentManager.updateCurrentTime(videoState.currentTime);
    }, [videoState.currentTime, segmentManager]);

    // Auto-hide controls
    useEffect(() => {
      isPlayingRef.current = videoState.isPlaying;
      uiStateManager.startAutoHide(videoState.isPlaying);

      return () => {
        uiStateManager.stopAutoHide();
      };
    }, [videoState.isPlaying, uiStateManager]);

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        loadPlayer: async (
          player: Player,
          kodikLinks?: KodikVideoLinks | null,
          isFromHint?: boolean,
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
            'isFromHint:',
            isFromHint || false,
          );

          // Setup video headers BEFORE loading video to avoid 403
          const rawSiteUrl = localStorage.getItem('animeLibUrl');
          const siteUrl = new URL(rawSiteUrl || 'https://v3.animelib.org')
            .origin;
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

          setCurrentPlayerData(player);

          // Get current episode ID
          const currentEpisode = episodes[currentEpisodeIndex];
          const episodeId = currentEpisode?.id;

          // Load player with timecode if available
          await controllerRef.current.loadPlayer({
            player,
            kodikLinks: kodikLinks || null,
            initialTimecode: initialTimecode || undefined,
            isFromHint: isFromHint || false,
            episodeId,
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

        isPlaying: () => videoState.isPlaying,

        videoRef,
      }),
      [
        isControllerReady,
        initialTimecode,
        onTimecodeApplied,
        videoState.isPlaying,
        currentEpisodeIndex,
        episodes,
      ],
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
          uiStateManager.setHoverTime(time);
        }
      },
      [videoState.duration, uiStateManager],
    );

    const handleProgressMouseLeave = useCallback(() => {
      uiStateManager.setHoverTime(null);
    }, [uiStateManager]);

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

        // Очищаем предыдущий таймаут если есть
        const clickTimeout = uiStateManager.getClickTimeout();
        if (clickTimeout) {
          clearTimeout(clickTimeout);
        }

        // Debounce для избежания конфликта с двойным кликом
        const newTimeout = setTimeout(() => {
          // Показываем иконку при ЛЮБОМ переключении плей/пауза
          uiStateManager.showPlayPauseIcon();

          handleTogglePlay();
          uiStateManager.setClickTimeout(null);
        }, 200); // 200ms debounce

        uiStateManager.setClickTimeout(newTimeout);
      },
      [handleTogglePlay, uiStateManager],
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

        // Отменяем pending клик при двойном клике
        uiStateManager.clearClickTimeout();

        await handleToggleFullscreen();
      },
      [handleToggleFullscreen, uiStateManager],
    );

    const handleSkipSegment = useCallback(() => {
      segmentManager.skipCurrentSegment();
    }, [segmentManager]);

    const handleAutoSkipChange = useCallback(
      (settings: {
        skipOpenings: boolean;
        skipEndings: boolean;
        skipCompilations: boolean;
        skipSplashScreens: boolean;
      }) => {
        segmentManager.updateSettings(settings);
      },
      [segmentManager],
    );

    const handleNextEpisodeCancel = useCallback(() => {
      console.log('[VideoPlayer] Next episode cancelled by user');
      nextEpisodeCancelledRef.current = true;
      setShowNextEpisodeNotification(false);
      // Ставим видео на паузу (оно уже в конце т.к. ended event)
      const video = videoRef.current;
      if (video) {
        // Pause directly and ensure it stays paused
        video.pause();
        console.log(
          '[VideoPlayer] Next episode cancelled: video paused at end',
        );
      }
    }, []);

    const handleNextEpisodePlayNow = useCallback(() => {
      if (nextEpisodeCancelledRef.current) {
        return;
      }

      setShowNextEpisodeNotification(false);

      const hasNextEpisode = currentEpisodeIndex < episodes.length - 1;
      if (hasNextEpisode) {
        const selectWithAutoplay =
          onEpisodeSelectWithAutoplay ?? onEpisodeSelect;
        selectWithAutoplay(currentEpisodeIndex + 1);
      }
    }, [
      currentEpisodeIndex,
      episodes.length,
      onEpisodeSelect,
      onEpisodeSelectWithAutoplay,
    ]);

    useEffect(() => {
      if (!('mediaSession' in navigator)) return;

      navigator.mediaSession.setActionHandler('play', () => {
        handleTogglePlay();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        handleTogglePlay();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (currentEpisodeIndex < episodes.length - 1) {
          const selectWithAutoplay =
            onEpisodeSelectWithAutoplay ?? onEpisodeSelect;
          selectWithAutoplay(currentEpisodeIndex + 1);
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentEpisodeIndex > 0) {
          onEpisodeSelect(currentEpisodeIndex - 1);
        }
      });

      // eslint-disable-next-line consistent-return
      return () => {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      };
    }, [
      handleTogglePlay,
      currentEpisodeIndex,
      episodes.length,
      onEpisodeSelect,
      onEpisodeSelectWithAutoplay,
    ]);

    useEffect(() => {
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.playbackState = videoState.isPlaying
        ? 'playing'
        : 'paused';
    }, [videoState.isPlaying]);

    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#1c1c1c',
          overflow: 'hidden',
          borderRadius: PLAYER_BORDER_RADIUS,
          cursor: uiState.showControls ? 'default' : 'none',
          '&:hover': {
            '& .player-controls': {
              opacity: 1,
            },
          },
        }}
        onMouseMove={() => {
          if (!uiState.showControls) {
            uiStateManager.showPlayerControls();
          }
          uiStateManager.startAutoHide(videoState.isPlaying);
        }}
        onClick={handlePlayerClick}
        onDoubleClick={handlePlayerDoubleClick}
      >
        {/* Информация об аниме */}
        <AnimeInfoComponent
          animeInfo={animeInfo}
          show={uiState.showControls}
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
          crossOrigin="anonymous"
          playsInline
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            visibility: 'visible',
            backgroundColor: '#000',
            cursor: 'inherit',
            objectFit: 'contain',
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
        {uiState.showCenterIcon && (
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
              {/* Показываем иконку РЕЗУЛЬТАТА (инвертируем т.к. состояние ещё не обновилось) */}
              {!videoState.isPlaying ? (
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
          onEpisodeSelect={onEpisodeSelectWithAutoplay || onEpisodeSelect}
          showControls={uiState.showControls}
          episodes={episodes}
        />

        {/* Next Episode Notification */}
        {showNextEpisodeNotification &&
          currentEpisodeIndex < episodes.length - 1 && (
            <NextEpisodeNotification
              nextEpisodeNumber={episodes[currentEpisodeIndex + 1].number}
              nextEpisodeName={episodes[currentEpisodeIndex + 1].name}
              countdownSeconds={6}
              onCancel={handleNextEpisodeCancel}
              onPlayNow={handleNextEpisodePlayNow}
            />
          )}

        {/* Custom controls */}
        {uiState.showControls && (
          <VideoControls
            isPlaying={videoState.isPlaying}
            isLoading={isLoading}
            currentTime={videoState.currentTime}
            duration={videoState.duration}
            volume={videoState.volume}
            isMuted={videoState.isMuted}
            buffered={videoState.buffered}
            isFullscreen={uiState.isFullscreen}
            showControls={uiState.showControls}
            onMenuOpenChange={(isOpen) => uiStateManager.setMenuOpen(isOpen)}
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
            ambientLightEnabled={ambientLightEnabled}
            onAmbientLightChange={onAmbientLightChange}
            onAutoplayChange={onAutoplayChange}
            timecode={timecode}
            currentSegment={currentSegment}
            onSkipSegment={handleSkipSegment}
            showEpisodes={uiState.showEpisodesList}
            onShowEpisodesChange={(show) =>
              uiStateManager.setShowEpisodesList(show)
            }
            autoSkipSettings={segmentManager.getSettings()}
            onAutoSkipChange={handleAutoSkipChange}
            onMouseMove={() => {
              if (!uiState.showControls) {
                uiStateManager.showPlayerControls();
              }
              uiStateManager.startAutoHide(videoState.isPlaying);
            }}
            onMouseLeave={() => {
              // Auto-hide will handle this
            }}
            onProgressMouseMove={handleProgressMouseMove}
            onProgressMouseLeave={handleProgressMouseLeave}
            onSeek={handleSeek}
            hoverTime={uiState.hoverTime}
            thumbnailManager={
              controllerRef.current?.getThumbnailManager() || null
            }
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={onSidebarToggle || (() => {})}
          />
        )}
      </Box>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export default React.memo(VideoPlayer);
export type { VideoPlayerRef };
