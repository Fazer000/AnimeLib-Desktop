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
import {
  Alert,
  Box,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import { PlayArrow, Pause } from '@mui/icons-material';
import {
  Player,
  KodikVideoLinks,
  AnimeInfo,
  animeApi,
} from '../../api/animeApi';
import VideoControls from './VideoControls';
// @ts-ignore
import SubtitlesOverlay from './SubtitlesOverlay';
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
  SubtitleTrack,
  SubtitlesSettings,
} from '../../services/player';
import {
  PLAYER_BORDER_RADIUS,
  PLAYER_CENTER_ICON_FONT_SIZE,
  PLAYER_CENTER_ICON_SIZE,
  PLAYER_EPISODES_VISIBLE_BY_DEFAULT,
  PLAYER_FULLSCREEN_EASING,
  PLAYER_FULLSCREEN_TRANSITION,
  SUBTITLES_DEFAULT_SETTINGS,
} from '../../../constants';
import { getSiteOrigin } from '../../utils/urlHelpers';
import {
  SubtitleCue,
  SubtitleStyleSettings,
} from '../../utils/subtitleHelpers';

type FullscreenPhase = 'enter' | 'exit' | null;

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
  initialTimecode?: number | null;
  // eslint-disable-next-line react/require-default-props
  onTimecodeApplied?: () => void;
  // eslint-disable-next-line react/require-default-props
  onSaveBookmark?: (episodeId: number, currentTime: number) => void;
  // eslint-disable-next-line react/require-default-props
  hasBookmark?: boolean;
  // eslint-disable-next-line react/require-default-props
  bookmarkedEpisodeId?: number | null;
  // eslint-disable-next-line react/require-default-props
  autoplayEnabled?: boolean;
  // eslint-disable-next-line react/require-default-props
  onAutoplayChange?: (enabled: boolean) => void;
  // eslint-disable-next-line react/require-default-props
  selectedPlayer?: {
    id: number;
    player: string;
    team: {
      name: string;
    };
  } | null;
  // eslint-disable-next-line react/require-default-props
  timecode?: TimeCode[];
  // eslint-disable-next-line react/require-default-props
  sidebarCollapsed?: boolean;
  // eslint-disable-next-line react/require-default-props
  onSidebarToggle?: () => void;
  // eslint-disable-next-line react/require-default-props
  onOpenDownloadManager?: () => void;
  // eslint-disable-next-line react/require-default-props
  onAspectRatioChange?: (aspectRatio: number | null) => void;
  // eslint-disable-next-line react/require-default-props
  ambientLightEnabled?: boolean;
  // eslint-disable-next-line react/require-default-props
  onAmbientLightChange?: (enabled: boolean) => void;
  // eslint-disable-next-line react/require-default-props
  offlineMode?: boolean;
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
      onOpenDownloadManager,
      onAspectRatioChange,
      ambientLightEnabled = true,
      onAmbientLightChange,
      offlineMode = false,
    },
    ref,
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<VideoPlayerController | null>(null);
    const pendingLoadRef = useRef<{
      player: Player;
      kodikLinks?: KodikVideoLinks | null;
      isFromHint?: boolean;
    } | null>(null);
    const isPlayingRef = useRef<boolean>(false);

    const [isControllerReady, setIsControllerReady] = useState<boolean>(false);
    const [currentPlayerData, setCurrentPlayerData] = useState<Player | null>(
      null,
    );
    const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);

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

    const [hasStartedPlayback, setHasStartedPlayback] =
      useState<boolean>(false);

    const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
    const [selectedQuality, setSelectedQuality] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
    const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
    const [subtitleSettings, setSubtitleSettings] = useState<SubtitlesSettings>(
      SUBTITLES_DEFAULT_SETTINGS,
    );

    const [uiState, setUIState] = useState<UIState>({
      showControls: true,
      isFullscreen: false,
      showCenterIcon: false,
      hoverTime: null,
      isMenuOpen: false,
      showEpisodesList: PLAYER_EPISODES_VISIBLE_BY_DEFAULT,
    });
    const [uiStateManager] = useState(
      () =>
        new UIStateManager({
          onStateChange: (state) => setUIState(state),
        }),
    );

    const videoAspectRatioRef = useRef<number | null>(null);

    const [fullscreenPhase, setFullscreenPhase] =
      useState<FullscreenPhase>(null);
    const prevFullscreenRef = useRef<boolean>(false);

    const [autoplayManager] = useState(
      () =>
        new AutoplayManager({
          enabled: autoplayEnabled,
          onEpisodeChange: onEpisodeSelect,
        }),
    );

    const [currentSegment, setCurrentSegment] = useState<TimeCode | null>(null);
    const [segmentManager] = useState(
      () =>
        new SegmentManager({
          onSegmentChange: (segment) => setCurrentSegment(segment),
          onSkipSegment: (time) => controllerRef.current?.seekTo(time),
        }),
    );

    const timecodeAppliedRef = useRef<boolean>(false);

    const [skipManager] = useState(() => new SkipManager());
    const [skipTime, setSkipTime] = useState(skipManager.getSkipTime());

    const [sourceNotice, setSourceNotice] = useState<{
      text: string;
      severity: 'info' | 'warning';
    } | null>(null);

    const [showNextEpisodeNotification, setShowNextEpisodeNotification] =
      useState(false);
    const nextEpisodeNotificationShownRef = useRef(false);
    const nextEpisodeCancelledRef = useRef(false);

    useEffect(() => {
      const initController = async () => {
        if (!videoRef.current || !containerRef.current) {
          console.error('[VideoPlayer] Video or container ref not ready');
          return;
        }

        console.log('[VideoPlayer] Initializing controller...');

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
          onSubtitleTracksChange: setSubtitleTracks,
          onSubtitleCuesChange: setSubtitleCues,
          onSubtitleSettingsChange: setSubtitleSettings,
          onKeyPress: () => {
            uiStateManager.showPlayerControls();
            uiStateManager.startAutoHide(isPlayingRef.current);
          },
          onPlayPause: () => {
            uiStateManager.showPlayPauseIcon();
          },
          onSkipForward: (seconds: number) => {
            controllerRef.current?.getStateManager().skip(seconds);
          },
          skipTime: initialSkipTime,
          onToggleEpisodes: () => {
            uiStateManager.toggleEpisodesList();
          },
          onOfflineSourceLost: (recovered: boolean) =>
            setSourceNotice(
              recovered
                ? {
                    text: 'Скачанный файл удалён — воспроизведение продолжено с онлайн-источника',
                    severity: 'info',
                  }
                : {
                    text: 'Скачанный файл удалён, а сеть недоступна — воспроизведение остановлено',
                    severity: 'warning',
                  },
            ),
          autoplayManager,
        });

        const success = await controller.initialize(
          videoRef.current,
          containerRef.current,
        );

        if (success) {
          controllerRef.current = controller;
          setSubtitleSettings(controller.getSubtitlesManager().getSettings());
          setIsControllerReady(true);
          console.log('[VideoPlayer] Controller initialized successfully');
        } else {
          console.error('[VideoPlayer] Controller initialization failed');
          setIsControllerReady(false);
        }
      };

      initController();

      return () => {
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

    useEffect(() => {
      if (controllerRef.current) {
        const keyboardManager = controllerRef.current.getKeyboardManager();
        if (keyboardManager) {
          keyboardManager.updateConfig({ skipTime });
        }
      }
    }, [skipTime]);

    useEffect(() => {
      if (
        isControllerReady &&
        pendingLoadRef.current &&
        controllerRef.current
      ) {
        const { player, kodikLinks, isFromHint } = pendingLoadRef.current;
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
            initialTimecode: initialTimecode || undefined,
            isFromHint: isFromHint || false,
            episodeId: episodes[currentEpisodeIndex]?.id,
            animeId: animeInfo?.id,
            offlineAnimeId: offlineMode ? animeId : undefined,
          })
          .catch((error) => {
            console.error('[VideoPlayer] Error in pending load:', error);
          });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isControllerReady]);

    useEffect(() => {
      if (animeId && !offlineMode) {
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
    }, [animeId, offlineMode]);

    useEffect(() => {
      timecodeAppliedRef.current = false;
    }, [currentPlayerData]);

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

      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }, [currentPlayerData, onAspectRatioChange]);

    useEffect(() => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      autoplayManager.updateConfig({ enabled: false });
      autoplayManager.setupAutoAdvance(currentEpisodeIndex, episodes.length);
    }, [
      autoplayEnabled,
      currentEpisodeIndex,
      episodes.length,
      autoplayManager,
    ]);

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

    useEffect(() => {
      nextEpisodeNotificationShownRef.current = false;
      nextEpisodeCancelledRef.current = false;
      setShowNextEpisodeNotification(false);
    }, [currentEpisodeIndex]);

    useEffect(() => {
      const handleFullscreenChange = () => {
        const isFullscreen = !!document.fullscreenElement;
        uiStateManager.setFullscreen(isFullscreen);
        uiStateManager.showPlayerControls();
        uiStateManager.startAutoHide(isPlayingRef.current);
        console.log('[VideoPlayer] Player fullscreen changed:', isFullscreen);
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () =>
        document.removeEventListener(
          'fullscreenchange',
          handleFullscreenChange,
        );
    }, [uiStateManager]);

    useEffect(() => {
      if (prevFullscreenRef.current === uiState.isFullscreen) return undefined;

      prevFullscreenRef.current = uiState.isFullscreen;
      setFullscreenPhase(uiState.isFullscreen ? 'enter' : 'exit');

      const timer = setTimeout(
        () => setFullscreenPhase(null),
        PLAYER_FULLSCREEN_TRANSITION,
      );
      return () => clearTimeout(timer);
    }, [uiState.isFullscreen]);

    useEffect(() => {
      segmentManager.setSegments(timecode as TimeCodeSegment[]);
    }, [timecode, segmentManager]);

    useEffect(() => {
      segmentManager.setDuration(videoState.duration);
    }, [videoState.duration, segmentManager]);

    useEffect(() => {
      segmentManager.updateCurrentTime(videoState.currentTime);
    }, [videoState.currentTime, segmentManager]);

    useEffect(() => {
      isPlayingRef.current = videoState.isPlaying;
      uiStateManager.startAutoHide(videoState.isPlaying);

      return () => {
        uiStateManager.stopAutoHide();
      };
    }, [videoState.isPlaying, uiStateManager]);

    useEffect(() => {
      if (videoState.isPlaying) {
        setHasStartedPlayback(true);
      }
    }, [videoState.isPlaying]);

    useEffect(() => {
      setHasStartedPlayback(false);
    }, [currentEpisodeIndex, currentPlayerData]);

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
            pendingLoadRef.current = { player, kodikLinks, isFromHint };
            return;
          }

          console.log(
            '[VideoPlayer] Loading player:',
            player.team.name,
            player.player,
            'isFromHint:',
            isFromHint || false,
          );

          const siteUrl = getSiteOrigin();
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

          const currentEpisode = episodes[currentEpisodeIndex];
          const episodeId = currentEpisode?.id;

          await controllerRef.current.loadPlayer({
            player,
            kodikLinks: kodikLinks || null,
            initialTimecode: initialTimecode || undefined,
            isFromHint: isFromHint || false,
            episodeId,
            animeId: animeInfo?.id,
            offlineAnimeId: offlineMode ? animeId : undefined,
          });

          if (initialTimecode !== null) {
            timecodeAppliedRef.current = true;
            console.log(
              `[VideoPlayer] Timecode ${initialTimecode}s will be applied by controller`,
            );
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
          controllerRef.current?.clearPlayer();
          setCurrentPlayerData(null);
          pendingLoadRef.current = null;
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
        episodes,
        currentEpisodeIndex,
        initialTimecode,
        animeInfo?.id,
        offlineMode,
        animeId,
        onTimecodeApplied,
        videoState.isPlaying,
      ],
    );

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

    const handleSubtitleTrackChange = useCallback(
      (trackName: string | null) => {
        controllerRef.current?.getSubtitlesManager().selectTrack(trackName);
      },
      [],
    );

    const handleSubtitleSettingsChange = useCallback(
      (patch: Partial<SubtitleStyleSettings>) => {
        controllerRef.current?.getSubtitlesManager().updateSettings(patch);
      },
      [],
    );

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

        const clickTimeout = uiStateManager.getClickTimeout();
        if (clickTimeout) {
          clearTimeout(clickTimeout);
        }

        const newTimeout = setTimeout(() => {
          uiStateManager.showPlayPauseIcon();

          handleTogglePlay();
          uiStateManager.setClickTimeout(null);
        }, 200);

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
      const video = videoRef.current;
      if (video) {
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

    const fullscreenAnimationName =
      fullscreenPhase === 'enter'
        ? 'playerFullscreenEnter'
        : 'playerFullscreenExit';
    const fullscreenAnimation = fullscreenPhase
      ? `${fullscreenAnimationName} ${PLAYER_FULLSCREEN_TRANSITION}ms ${PLAYER_FULLSCREEN_EASING}`
      : 'none';

    const showInitialPlayButton =
      !!currentPlayerData &&
      !hasStartedPlayback &&
      !videoState.isPlaying &&
      !isLoading &&
      !videoState.isBuffering;

    // @ts-ignore
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
          transition: `border-radius ${PLAYER_FULLSCREEN_TRANSITION}ms ${PLAYER_FULLSCREEN_EASING}`,
          animation: fullscreenAnimation,
          '@keyframes playerFullscreenEnter': {
            from: { opacity: 0.4, transform: 'scale(0.97)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
          '@keyframes playerFullscreenExit': {
            from: { opacity: 0.4, transform: 'scale(1.03)' },
            to: { opacity: 1, transform: 'scale(1)' },
          },
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

        <SubtitlesOverlay
          cues={subtitleCues}
          currentTime={videoState.currentTime}
          settings={subtitleSettings}
        />

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
            <CircularProgress size={50} sx={{ color: 'white' }} />
          </Box>
        )}

        {showInitialPlayButton && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1001,
              width: PLAYER_CENTER_ICON_FONT_SIZE,
              height: PLAYER_CENTER_ICON_FONT_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              cursor: 'pointer',
              backgroundColor: 'rgba(28, 28, 28, 0.45)',
              backdropFilter: 'blur(4px)',
              transition:
                'transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translate(-50%, -50%) scale(1.08)',
                backgroundColor: 'rgba(124, 58, 237, 0.35)',
                boxShadow: '0 0 32px 8px rgba(124, 58, 237, 0.45)',
              },
            }}
          >
            <PlayArrow
              sx={{
                fontSize: PLAYER_CENTER_ICON_FONT_SIZE,
                color: 'white',
                marginLeft: '8px',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
              }}
            />
          </Box>
        )}

        {uiState.showCenterIcon && !showInitialPlayButton && (
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
                width: PLAYER_CENTER_ICON_SIZE,
                height: PLAYER_CENTER_ICON_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!videoState.isPlaying ? (
                <Pause
                  sx={{
                    fontSize: PLAYER_CENTER_ICON_FONT_SIZE,
                    color: 'white',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  }}
                />
              ) : (
                <PlayArrow
                  sx={{
                    fontSize: PLAYER_CENTER_ICON_FONT_SIZE,
                    color: 'white',
                    marginLeft: '8px',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  }}
                />
              )}
            </Box>
          </Box>
        )}

        <EpisodeNavigationHint
          currentEpisodeIndex={currentEpisodeIndex}
          totalEpisodes={episodes.length}
          onEpisodeSelect={onEpisodeSelectWithAutoplay || onEpisodeSelect}
          showControls={uiState.showControls}
          episodes={episodes}
        />

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
            subtitleTracks={subtitleTracks}
            subtitleSettings={subtitleSettings}
            onSubtitleTrackChange={handleSubtitleTrackChange}
            onSubtitleSettingsChange={handleSubtitleSettingsChange}
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
            onSidebarToggle={onSidebarToggle}
            onOpenDownloadManager={onOpenDownloadManager}
          />
        )}

        <Snackbar
          open={Boolean(sourceNotice)}
          autoHideDuration={7000}
          onClose={() => setSourceNotice(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={sourceNotice?.severity || 'info'}
            variant="filled"
            onClose={() => setSourceNotice(null)}
            sx={{ fontSize: '0.82rem' }}
          >
            {sourceNotice?.text}
          </Alert>
        </Snackbar>
      </Box>
    );
  },
);

VideoPlayer.displayName = 'VideoPlayer';

export default React.memo(VideoPlayer);
export type { VideoPlayerRef };
