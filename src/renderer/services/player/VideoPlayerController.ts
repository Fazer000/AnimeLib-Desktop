import { Player, KodikVideoLinks } from '../../api/animeApi';
import { ShakaPlayerManager } from './ShakaPlayerManager';
import { VideoStateManager } from './VideoStateManager';
import { QualityManager } from './QualityManager';
import {
  SubtitlesManager,
  SubtitleTrack,
  SubtitlesSettings,
} from './SubtitlesManager';
import { SubtitleCue } from '../../utils/subtitleHelpers';
import { KeyboardManager } from './KeyboardManager';
import ThumbnailManager from './ThumbnailManager';
import { AutoplayManager } from './AutoplayManager';
import { WatchStatsManager } from './WatchStatsManager';
import { OfflineSourceGuard } from './OfflineSourceGuard';

import { createLogger } from '../../../shared/logger';

const log = createLogger('VideoPlayerController');

export interface VideoPlayerControllerConfig {
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onStateChange?: (state: any) => void;
  onTimeUpdate?: (currentTime: number, buffered: number) => void;
  onQualityOptionsChange?: (options: any[]) => void;
  onSelectedQualityChange?: (quality: string) => void;
  onSubtitleTracksChange?: (tracks: SubtitleTrack[]) => void;
  onSubtitleCuesChange?: (cues: SubtitleCue[]) => void;
  onSubtitleSettingsChange?: (settings: SubtitlesSettings) => void;
  onKeyPress?: () => void;
  onPlayPause?: () => void;
  onSkipForward?: (seconds: number) => void;
  skipTime?: number;
  onToggleEpisodes?: () => void;
  autoplayManager?: AutoplayManager;
  onOfflineSourceLost?: (recovered: boolean) => void;
}

export interface PlayerLoadOptions {
  animeId?: number;
  offlineAnimeId?: string;
  player: Player;
  kodikLinks?: KodikVideoLinks | null;
  initialTimecode?: number;
  isFromHint?: boolean;
  episodeId?: number;
}

/**
 * Главный контроллер видеоплеера
 * Координирует работу всех менеджеров
 */
export class VideoPlayerController {
  private shakaManager: ShakaPlayerManager;

  private stateManager: VideoStateManager;

  private qualityManager: QualityManager;

  private subtitlesManager: SubtitlesManager;

  private keyboardManager: KeyboardManager;

  private thumbnailManager: ThumbnailManager;

  private config: VideoPlayerControllerConfig;

  private videoElement: HTMLVideoElement | null = null;

  private containerElement: HTMLDivElement | null = null;

  private isInitialized: boolean = false;

  private currentPlayerData: PlayerLoadOptions | null = null;

  private isInitialLoad: boolean = true;

  private lastLoadedPlayer: Player | null = null;

  private lastEpisodeId: number | null = null;

  private savedTime: number = 0;

  private shouldAutoPlay: boolean = false;

  private isNetworkBuffering: boolean = false;

  private lastEmittedBuffering: boolean = false;

  private watchStatsManager: WatchStatsManager = new WatchStatsManager();

  private offlineGuard: OfflineSourceGuard;

  constructor(config: VideoPlayerControllerConfig = {}) {
    this.config = config;

    this.offlineGuard = new OfflineSourceGuard({
      onSourceLost: () => this.handleOfflineSourceLost(),
    });

    this.shakaManager = new ShakaPlayerManager({
      onError: config.onError,
      onLoadingChange: config.onLoadingChange,
      onBufferingChange: (isBuffering) =>
        this.handleNetworkBuffering(isBuffering),
    });

    this.stateManager = new VideoStateManager({
      onStateChange: (updates) => this.handleStateManagerUpdate(updates),
      onTimeUpdate: (currentTime, buffered) =>
        this.handleTimeUpdate(currentTime, buffered),
    });

    this.qualityManager = new QualityManager({
      onQualityOptionsChange: config.onQualityOptionsChange,
      onSelectedQualityChange: config.onSelectedQualityChange,
    });

    this.subtitlesManager = new SubtitlesManager({
      onTracksChange: config.onSubtitleTracksChange,
      onCuesChange: config.onSubtitleCuesChange,
      onSettingsChange: config.onSubtitleSettingsChange,
      onError: config.onError,
    });

    this.keyboardManager = new KeyboardManager({
      onPlayPause: () => {
        this.config.onPlayPause?.();
        this.stateManager.togglePlay();
      },
      onSeek: (seconds) => this.stateManager.skip(seconds),
      onSeekToPercent: (percent) => this.stateManager.seekToPercent(percent),
      onVolumeChange: (delta) => {
        const newVolume = this.stateManager.getState().volume + delta;
        this.stateManager.setVolume(newVolume);
      },
      onToggleMute: () => this.stateManager.toggleMute(),
      onToggleFullscreen: () => this.toggleFullscreen(),
      onTogglePictureInPicture: () => this.togglePictureInPicture(),
      onPlaybackRateChange: (delta) => {
        const newRate = this.stateManager.getState().playbackRate + delta;
        this.stateManager.setPlaybackRate(newRate);
      },
      onSkipForward: config.onSkipForward,
      skipTime: config.skipTime,
      onKeyPress: config.onKeyPress,
      onToggleEpisodes: config.onToggleEpisodes,
    });

    this.thumbnailManager = new ThumbnailManager();
  }

  /**
   * Считает итоговую буферизацию: сетевая учитывается только при воспроизведении
   */
  private computeBuffering(): boolean {
    const state = this.stateManager.getState();
    return state.isBuffering || (this.isNetworkBuffering && state.isPlaying);
  }

  /**
   * Объединяет буферизацию медиаэлемента и потока в единый флаг состояния
   */
  private handleStateManagerUpdate(updates: any): void {
    if (updates.isBuffering === undefined && updates.isPlaying === undefined) {
      this.config.onStateChange?.(updates);
      return;
    }

    const effective = this.computeBuffering();
    this.lastEmittedBuffering = effective;

    this.config.onStateChange?.({ ...updates, isBuffering: effective });
  }

  /**
   * Прокидывает время воспроизведения мимо состояния React
   */
  private handleTimeUpdate(currentTime: number, buffered: number): void {
    this.watchStatsManager.updateProgress(
      currentTime,
      this.stateManager.getState().duration,
    );
    this.config.onTimeUpdate?.(currentTime, buffered);
  }

  /**
   * Обрабатывает сигнал буферизации от Shaka Player
   */
  private handleNetworkBuffering(isBuffering: boolean): void {
    this.isNetworkBuffering = isBuffering;

    const effective = this.computeBuffering();
    if (effective === this.lastEmittedBuffering) {
      return;
    }

    this.lastEmittedBuffering = effective;
    this.config.onStateChange?.({ isBuffering: effective });
  }

  /**
   * Инициализирует контроллер
   */
  async initialize(
    videoElement: HTMLVideoElement,
    containerElement: HTMLDivElement,
  ): Promise<boolean> {
    if (this.isInitialized) {
      log.debug('Already initialized');
      return true;
    }

    this.videoElement = videoElement;
    this.containerElement = containerElement;

    const success = await this.shakaManager.initialize(videoElement);
    if (!success) {
      return false;
    }

    this.stateManager.attach(videoElement);

    this.subtitlesManager.attach(videoElement);

    this.keyboardManager.enable();

    this.isInitialized = true;
    log.debug('Initialized successfully');
    return true;
  }

  /**
   * Загружает плеер с видео
   */
  async loadPlayer(options: PlayerLoadOptions): Promise<void> {
    if (!this.isInitialized) {
      log.error('Not initialized');
      return;
    }

    log.debug(
      'Loading player:',
      options.player.team.name,
      options.player.player,
    );

    const isSamePlayer =
      this.lastLoadedPlayer !== null &&
      this.lastLoadedPlayer.id === options.player.id;
    const isSameEpisode =
      this.lastEpisodeId !== null &&
      options.episodeId !== undefined &&
      this.lastEpisodeId === options.episodeId;

    const isVoiceChange = !this.isInitialLoad && isSamePlayer && isSameEpisode;

    const isEpisodeChange = !this.isInitialLoad && !isVoiceChange;

    const hasBookmark =
      options.initialTimecode !== undefined && options.initialTimecode > 0;

    log.debug('Load context:', {
      isInitialLoad: this.isInitialLoad,
      isVoiceChange,
      isEpisodeChange,
      hasBookmark,
      isFromHint: options.isFromHint || false,
      lastPlayerId: this.lastLoadedPlayer?.id,
      currentPlayerId: options.player.id,
      lastEpisodeId: this.lastEpisodeId,
      currentEpisodeId: options.episodeId,
      isSamePlayer,
      isSameEpisode,
    });

    let currentTime: number | undefined;
    if (isVoiceChange && this.videoElement) {
      const state = this.stateManager.getState();
      currentTime = state.isPlaying ? state.currentTime : undefined;
    }

    const loadContext = {
      isVoiceChange,
      isEpisodeChange,
      hasBookmark,
      isFromHint: options.isFromHint || false,
      currentTime,
    };

    this.shouldAutoPlay =
      this.config.autoplayManager?.determineAutoplay(loadContext) || false;

    this.config.autoplayManager?.setShouldAutoplayOnLoad(this.shouldAutoPlay);

    if (hasBookmark) {
      log.debug('Bookmark timecode provided:', options.initialTimecode);
      this.savedTime = options.initialTimecode!;
    } else if (isVoiceChange && currentTime !== undefined) {
      log.debug('Voice change, saving time:', {
        time: currentTime,
        shouldAutoPlay: this.shouldAutoPlay,
      });
      this.savedTime = currentTime;
    } else {
      this.savedTime = 0;
      this.isInitialLoad = false;
    }

    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
    }

    this.currentPlayerData = options;
    this.lastLoadedPlayer = options.player;
    this.lastEpisodeId = options.episodeId || null;

    this.watchStatsManager.setContext(
      options.animeId ?? null,
      options.player.id,
      options.offlineAnimeId && options.episodeId
        ? { animeId: options.offlineAnimeId, episodeId: options.episodeId }
        : null,
    );

    this.qualityManager.createQualityOptions(
      options.player,
      options.kodikLinks,
      options.episodeId,
    );

    this.subtitlesManager.setTracks(options.player);

    await this.loadCurrentQuality();
  }

  /**
   * Загружает видео с текущим качеством
   */
  private async loadCurrentQuality(): Promise<void> {
    const qualityOption = this.qualityManager.getSelectedQualityOption();
    if (!qualityOption) {
      log.error('No quality option available');
      return;
    }

    if (this.savedTime === 0) {
      this.stateManager.reset();
    }

    const loaded = await this.shakaManager.loadVideo(
      qualityOption,
      this.savedTime > 0 ? this.savedTime : undefined,
      this.shouldAutoPlay,
    );

    if (loaded && this.videoElement?.src) {
      this.thumbnailManager.loadVideo(this.videoElement.src);
    }

    if (loaded) {
      this.offlineGuard.watch(qualityOption.src);
    }

    this.savedTime = 0;
    this.shouldAutoPlay = false;
  }

  /**
   * Восстанавливает воспроизведение после удаления локального файла
   */
  private async handleOfflineSourceLost(): Promise<void> {
    const state = this.stateManager.getState();
    const savedTime = state.currentTime;
    const wasPlaying = state.isPlaying;
    const previousQuality = this.qualityManager.getSelectedQuality();
    const options = this.currentPlayerData;

    await this.shakaManager.detachSource();

    if (!options || !(await OfflineSourceGuard.isOnline())) {
      log.warn('Offline source lost, no fallback');
      this.config.onOfflineSourceLost?.(false);
      return;
    }

    this.qualityManager.createQualityOptions(
      options.player,
      options.kodikLinks,
    );

    if (!this.qualityManager.hasOptions()) {
      this.config.onOfflineSourceLost?.(false);
      return;
    }

    this.qualityManager.setSelectedQuality(previousQuality);

    this.savedTime = savedTime;
    this.shouldAutoPlay = wasPlaying;

    await this.loadCurrentQuality();
    this.config.onOfflineSourceLost?.(true);
  }

  /**
   * Изменяет качество видео
   */
  async changeQuality(quality: string): Promise<void> {
    log.debug('Changing quality to:', quality);

    const state = this.stateManager.getState();
    const savedTime = state.currentTime || 0;
    const wasPlaying = state.isPlaying;

    if (!this.qualityManager.setSelectedQuality(quality)) {
      return;
    }

    const qualityOption = this.qualityManager.getSelectedQualityOption();
    if (!qualityOption) {
      return;
    }

    await this.shakaManager.loadVideo(qualityOption, savedTime, wasPlaying);
  }

  /**
   * Очищает плеер
   */
  clearPlayer(): void {
    log.debug('Clearing player');

    this.shakaManager.cancelLoad();
    this.offlineGuard.reset();

    this.isInitialLoad = true;
    this.savedTime = 0;
    this.shouldAutoPlay = false;
    this.isNetworkBuffering = false;
    this.lastEmittedBuffering = false;
    this.watchStatsManager.reset();
    this.currentPlayerData = null;

    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
    }

    this.thumbnailManager.clearCache();

    this.stateManager.reset();
    this.qualityManager.reset();
    this.subtitlesManager.reset();
  }

  /**
   * Полностью уничтожает плеер
   */
  async destroyPlayer(): Promise<void> {
    log.debug('Destroying player');

    this.clearPlayer();

    await this.shakaManager.unload();

    if (this.videoElement) {
      this.videoElement.src = '';
      this.videoElement.load();
    }
  }

  /**
   * Переключает полноэкранный режим ПЛЕЕРА (DOM fullscreen)
   */
  async toggleFullscreen(): Promise<void> {
    if (!this.containerElement) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (this.containerElement.requestFullscreen) {
        await this.containerElement.requestFullscreen();
      }
    } catch (error) {
      log.error('Fullscreen error:', error);
    }
  }

  /**
   * Переключает Picture-in-Picture
   */
  async togglePictureInPicture(): Promise<void> {
    if (!this.videoElement) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (this.videoElement.readyState >= 1) {
        await this.videoElement.requestPictureInPicture();
      } else {
        log.debug('Video not ready for PiP');
      }
    } catch (error) {
      log.error('PiP error:', error);
    }
  }

  /**
   * Перематывает на указанное время
   */
  seekTo(time: number): void {
    this.stateManager.seekTo(time);
  }

  /**
   * Получает ссылку на видео элемент
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  /**
   * Получает менеджер состояния
   */
  getStateManager(): VideoStateManager {
    return this.stateManager;
  }

  /**
   * Получает менеджер клавиатуры
   */
  getKeyboardManager(): KeyboardManager {
    return this.keyboardManager;
  }

  /**
   * Получает менеджер качества
   */
  getQualityManager(): QualityManager {
    return this.qualityManager;
  }

  /**
   * Получает менеджер превью
   */
  getThumbnailManager(): ThumbnailManager {
    return this.thumbnailManager;
  }

  /**
   * Получает менеджер субтитров
   */
  getSubtitlesManager(): SubtitlesManager {
    return this.subtitlesManager;
  }

  /**
   * Полностью уничтожает контроллер
   */
  async destroy(): Promise<void> {
    log.debug('Destroying controller');

    this.keyboardManager.disable();
    this.offlineGuard.reset();

    this.stateManager.detach();

    this.thumbnailManager.destroy();

    this.subtitlesManager.destroy();

    await this.shakaManager.destroy();

    this.isInitialized = false;
    this.videoElement = null;
    this.containerElement = null;
    this.currentPlayerData = null;
  }
}
