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
  PlaybackTimeStore,
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
import { useMediaSession } from './hooks/useMediaSession';
import { useVideoAspectRatio } from './hooks/useVideoAspectRatio';
import { offlineCatalog } from '../../services/offline';
import {
  SubtitleCue,
  SubtitleStyleSettings,
} from '../../utils/subtitleHelpers';

import { createLogger } from '../../../shared/logger';
import { BLACK_SHORT, SURFACE, SURFACE_DEEPEST } from '../../theme/palette';

const log = createLogger('VideoPlayer');

type FullscreenPhase = 'enter' | 'exit' | null;

interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

const EMPTY_TIMECODE: TimeCode[] = [];

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
  downloadManagerOpen?: boolean;
  // eslint-disable-next-line react/require-default-props
  onAspectRatioChange?: (aspectRatio: number | null) => void;
  // eslint-disable-next-line react/require-default-props
  ambientLightEnabled?: boolean;
  // eslint-disable-next-line react/require-default-props
  onAmbientLightChange?: (enabled: boolean) => void;
  // eslint-disable-next-line react/require-default-props
  offlineMode?: boolean;
  // eslint-disable-next-line react/require-default-props
  onPlayingChange?: (isPlaying: boolean) => void;
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
      timecode = EMPTY_TIMECODE,
      sidebarCollapsed = false,
      onSidebarToggle,
      onOpenDownloadManager,
      downloadManagerOpen = false,
      onAspectRatioChange,
      ambientLightEnabled = true,
      onAmbientLightChange,
      offlineMode = false,
      onPlayingChange,
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

    const [timeStore] = useState(() => new PlaybackTimeStore());

    const thumbnailManager = isControllerReady
      ? (controllerRef.current?.getThumbnailManager() ?? null)
      : null;

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
          log.error('Video or container ref not ready');
          return;
        }

        log.debug('Initializing controller...');

        const initialSkipTime = skipManager.getSkipTime();
        log.debug('Initial skip time from storage:', initialSkipTime);

        const controller = new VideoPlayerController({
          onError,
          onLoadingChange: setIsLoading,
          onStateChange: (updates) => {
            setVideoState((prev) => ({ ...prev, ...updates }));
          },
          onTimeUpdate: (currentTime, buffered) =>
            timeStore.set(currentTime, buffered),
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
          log.debug('Controller initialized successfully');
        } else {
          log.error('Controller initialization failed');
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
    }, [
      onError,
      skipManager,
      uiStateManager,
      autoplayManager,
      segmentManager,
      timeStore,
    ]);

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

        log.debug('Processing pending load:', player.team.name, player.player);

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
            log.error('Error in pending load:', error);
          });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isControllerReady]);

    useEffect(() => {
      if (!animeId) {
        return;
      }

      if (offlineMode) {
        setAnimeInfo(offlineCatalog.getAnimeInfo(animeId));
        return;
      }

      const loadAnimeInfo = async () => {
        try {
          const response = await animeApi.getAnimeInfo(animeId);
          setAnimeInfo(response.data);
        } catch (error) {
          log.error('Failed to load anime info:', error);
        }
      };

      loadAnimeInfo();
    }, [animeId, offlineMode]);

    useEffect(() => {
      timecodeAppliedRef.current = false;
    }, [currentPlayerData]);

    useVideoAspectRatio(videoRef, currentPlayerData, onAspectRatioChange);

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
          log.debug(
            'Video ended with autoplay disabled, showing next episode notification',
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
        log.debug('Player fullscreen changed:', isFullscreen);
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
      segmentManager.updateCurrentTime(timeStore.getCurrentTime());
      return timeStore.subscribe((currentTime) =>
        segmentManager.updateCurrentTime(currentTime),
      );
    }, [segmentManager, timeStore]);

    useEffect(() => {
      isPlayingRef.current = videoState.isPlaying;
      onPlayingChange?.(videoState.isPlaying);
      uiStateManager.startAutoHide(videoState.isPlaying);

      return () => {
        uiStateManager.stopAutoHide();
      };
    }, [videoState.isPlaying, uiStateManager, onPlayingChange]);

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
            log.debug(
              'Controller not ready yet, queueing load:',
              player.team.name,
            );
            pendingLoadRef.current = { player, kodikLinks, isFromHint };
            return;
          }

          log.debug(
            'Loading player:',
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
              log.error('Error parsing auth token:', error);
            }
          }

          if (window.electron?.electronAPI?.setupVideoHeaders) {
            try {
              await window.electron.electronAPI.setupVideoHeaders(
                siteUrl,
                authToken,
              );
              log.debug('Video headers setup complete');
            } catch (error) {
              log.error('Error setting up video headers:', error);
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
            log.debug(
              `Timecode ${initialTimecode}s will be applied by controller`,
            );
            if (onTimecodeApplied) {
              onTimecodeApplied();
            }
          }
        },

        clearPlayer: () => {
          log.debug('Clearing player');
          controllerRef.current?.clearPlayer();
          setCurrentPlayerData(null);
          pendingLoadRef.current = null;
        },

        destroyPlayer: async () => {
          log.debug('Destroying player (but keeping controller)');
          controllerRef.current?.clearPlayer();
          setCurrentPlayerData(null);
          pendingLoadRef.current = null;
        },

        seekTo: (time: number) => {
          log.debug('Seeking to time:', time);
          controllerRef.current?.seekTo(time);
        },

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
      log.debug('Quality changed to:', quality);
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
        log.warn('Cannot save bookmark: no current episode');
        return;
      }

      const currentTime = timeStore.getCurrentTime();

      log.debug('Saving bookmark:', {
        episodeId: currentEpisode.id,
        episodeName: currentEpisode.name,
        currentTime,
      });

      onSaveBookmark(currentEpisode.id, currentTime);
    }, [onSaveBookmark, episodes, currentEpisodeIndex, timeStore]);

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

    const [autoSkipSettings, setAutoSkipSettings] = useState(() =>
      segmentManager.getSettings(),
    );

    const handleAutoSkipChange = useCallback(
      (settings: {
        skipOpenings: boolean;
        skipEndings: boolean;
        skipCompilations: boolean;
        skipSplashScreens: boolean;
      }) => {
        segmentManager.updateSettings(settings);
        setAutoSkipSettings(segmentManager.getSettings());
      },
      [segmentManager],
    );

    const handleMenuOpenChange = useCallback(
      (isOpen: boolean) => uiStateManager.setMenuOpen(isOpen),
      [uiStateManager],
    );

    const handleShowEpisodesChange = useCallback(
      (show: boolean) => uiStateManager.setShowEpisodesList(show),
      [uiStateManager],
    );

    const handleControlsMouseMove = useCallback(() => {
      uiStateManager.showPlayerControls();
      uiStateManager.startAutoHide(isPlayingRef.current);
    }, [uiStateManager]);

    const handleControlsMouseLeave = useCallback(() => {}, []);

    const handleNextEpisodeCancel = useCallback(() => {
      log.debug('Next episode cancelled by user');
      nextEpisodeCancelledRef.current = true;
      setShowNextEpisodeNotification(false);
      const video = videoRef.current;
      if (video) {
        video.pause();
        log.debug('Next episode cancelled: video paused at end');
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

    useMediaSession({
      isPlaying: videoState.isPlaying,
      currentEpisodeIndex,
      episodeCount: episodes.length,
      onTogglePlay: handleTogglePlay,
      onEpisodeSelect,
      onEpisodeSelectWithAutoplay,
    });

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
          backgroundColor: SURFACE,
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
            backgroundColor: BLACK_SHORT,
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
          timeStore={timeStore}
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
              backgroundColor: SURFACE_DEEPEST,
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
            timeStore={timeStore}
            duration={videoState.duration}
            volume={videoState.volume}
            isMuted={videoState.isMuted}
            isFullscreen={uiState.isFullscreen}
            showControls={uiState.showControls}
            onMenuOpenChange={handleMenuOpenChange}
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
            onShowEpisodesChange={handleShowEpisodesChange}
            autoSkipSettings={autoSkipSettings}
            onAutoSkipChange={handleAutoSkipChange}
            onMouseMove={handleControlsMouseMove}
            onMouseLeave={handleControlsMouseLeave}
            onProgressMouseMove={handleProgressMouseMove}
            onProgressMouseLeave={handleProgressMouseLeave}
            onSeek={handleSeek}
            hoverTime={uiState.hoverTime}
            thumbnailManager={thumbnailManager}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={onSidebarToggle}
            onOpenDownloadManager={onOpenDownloadManager}
            downloadManagerOpen={downloadManagerOpen}
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
