/* eslint-disable no-console */
import { Player, KodikVideoLinks } from '../../api/animeApi';
import { ShakaPlayerManager } from './ShakaPlayerManager';
import { VideoStateManager } from './VideoStateManager';
import { QualityManager } from './QualityManager';
import { KeyboardManager } from './KeyboardManager';
import ThumbnailManager from './ThumbnailManager';
import { AutoplayManager } from './AutoplayManager';

export interface VideoPlayerControllerConfig {
  onError?: (error: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onStateChange?: (state: any) => void;
  onQualityOptionsChange?: (options: any[]) => void;
  onSelectedQualityChange?: (quality: string) => void;
  onKeyPress?: () => void; // Callback when hotkey is pressed
  onSkipForward?: (seconds: number) => void; // Custom skip forward
  skipTime?: number; // Custom skip time in seconds
  onToggleEpisodes?: () => void; // Toggle episodes list
  autoplayManager?: AutoplayManager; // AutoplayManager для управления автовоспроизведением
}

export interface PlayerLoadOptions {
  player: Player;
  kodikLinks?: KodikVideoLinks | null;
  initialTimecode?: number;
  isFromHint?: boolean; // Переключение эпизода через хинты (боковые кнопки)
  episodeId?: number; // ID эпизода для определения episode change
}

/**
 * Главный контроллер видеоплеера
 * Координирует работу всех менеджеров
 */
export class VideoPlayerController {
  private shakaManager: ShakaPlayerManager;

  private stateManager: VideoStateManager;

  private qualityManager: QualityManager;

  private keyboardManager: KeyboardManager;

  private thumbnailManager: ThumbnailManager;

  private config: VideoPlayerControllerConfig;

  private videoElement: HTMLVideoElement | null = null;

  private containerElement: HTMLDivElement | null = null;

  private isInitialized: boolean = false;

  private currentPlayerData: PlayerLoadOptions | null = null;

  // State tracking for voice/episode changes
  private isInitialLoad: boolean = true;

  private lastLoadedPlayer: Player | null = null;

  private lastEpisodeId: number | null = null;

  private savedTime: number = 0;

  private shouldAutoPlay: boolean = false;

  constructor(config: VideoPlayerControllerConfig = {}) {
    this.config = config;

    // Initialize managers
    this.shakaManager = new ShakaPlayerManager({
      onError: config.onError,
      onLoadingChange: config.onLoadingChange,
    });

    this.stateManager = new VideoStateManager({
      onStateChange: config.onStateChange,
    });

    this.qualityManager = new QualityManager({
      onQualityOptionsChange: config.onQualityOptionsChange,
      onSelectedQualityChange: config.onSelectedQualityChange,
    });

    this.keyboardManager = new KeyboardManager({
      onPlayPause: () => this.stateManager.togglePlay(),
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
      onSkipForward: config.onSkipForward, // Custom skip forward
      skipTime: config.skipTime, // Custom skip time
      onKeyPress: config.onKeyPress, // Pass the callback through
      onToggleEpisodes: config.onToggleEpisodes, // Toggle episodes list
    });

    this.thumbnailManager = new ThumbnailManager();
  }

  /**
   * Инициализирует контроллер
   */
  async initialize(
    videoElement: HTMLVideoElement,
    containerElement: HTMLDivElement,
  ): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[VideoPlayerController] Already initialized');
      return true;
    }

    this.videoElement = videoElement;
    this.containerElement = containerElement;

    // Initialize Shaka Player
    const success = await this.shakaManager.initialize(videoElement);
    if (!success) {
      return false;
    }

    // Attach state manager
    this.stateManager.attach(videoElement);

    // Enable keyboard controls
    this.keyboardManager.enable();

    this.isInitialized = true;
    console.log('[VideoPlayerController] Initialized successfully');
    return true;
  }

  /**
   * Загружает плеер с видео
   */
  async loadPlayer(options: PlayerLoadOptions): Promise<void> {
    if (!this.isInitialized) {
      console.error('[VideoPlayerController] Not initialized');
      return;
    }

    console.log(
      '[VideoPlayerController] Loading player:',
      options.player.team.name,
      options.player.player,
    );

    // Определяем контекст загрузки
    // Voice change = тот же плеер И тот же эпизод
    const isSamePlayer =
      this.lastLoadedPlayer !== null &&
      this.lastLoadedPlayer.id === options.player.id;
    const isSameEpisode =
      this.lastEpisodeId !== null &&
      options.episodeId !== undefined &&
      this.lastEpisodeId === options.episodeId;

    const isVoiceChange = !this.isInitialLoad && isSamePlayer && isSameEpisode;

    // Episode change = не первая загрузка и не voice change
    const isEpisodeChange = !this.isInitialLoad && !isVoiceChange;

    const hasBookmark =
      options.initialTimecode !== undefined && options.initialTimecode > 0;

    console.log('[VideoPlayerController] Load context:', {
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

    // Получаем текущее время для voice change
    let currentTime: number | undefined;
    if (isVoiceChange && this.videoElement) {
      const state = this.stateManager.getState();
      currentTime = state.isPlaying ? state.currentTime : undefined;
    }

    // Создаём контекст загрузки для AutoplayManager
    const loadContext = {
      isVoiceChange,
      isEpisodeChange,
      hasBookmark,
      isFromHint: options.isFromHint || false,
      currentTime,
    };

    // Определяем автовоспроизведение через AutoplayManager
    this.shouldAutoPlay =
      this.config.autoplayManager?.determineAutoplay(loadContext) || false;

    // Устанавливаем флаг автовоспроизведения в AutoplayManager
    this.config.autoplayManager?.setShouldAutoplayOnLoad(this.shouldAutoPlay);

    // Обрабатываем сохранённое время
    if (hasBookmark) {
      console.log(
        '[VideoPlayerController] Bookmark timecode provided:',
        options.initialTimecode,
      );
      this.savedTime = options.initialTimecode!;
    } else if (isVoiceChange && currentTime !== undefined) {
      console.log('[VideoPlayerController] Voice change, saving time:', {
        time: currentTime,
        shouldAutoPlay: this.shouldAutoPlay,
      });
      this.savedTime = currentTime;
    } else {
      this.savedTime = 0;
      this.isInitialLoad = false;
    }

    // Stop current playback
    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
    }

    // Set new player data
    this.currentPlayerData = options;
    this.lastLoadedPlayer = options.player;
    this.lastEpisodeId = options.episodeId || null;

    // Create quality options
    this.qualityManager.createQualityOptions(
      options.player,
      options.kodikLinks,
    );

    // Load video with best quality
    await this.loadCurrentQuality();
  }

  /**
   * Загружает видео с текущим качеством
   */
  private async loadCurrentQuality(): Promise<void> {
    const qualityOption = this.qualityManager.getSelectedQualityOption();
    if (!qualityOption) {
      console.error('[VideoPlayerController] No quality option available');
      return;
    }

    // Reset state if not restoring
    if (this.savedTime === 0) {
      this.stateManager.reset();
    }

    // Load video
    await this.shakaManager.loadVideo(
      qualityOption,
      this.savedTime > 0 ? this.savedTime : undefined,
      this.shouldAutoPlay,
    );

    // Загрузка видео источника для thumbnail manager
    if (this.videoElement?.src) {
      this.thumbnailManager.loadVideo(this.videoElement.src);
    }

    // Reset saved state
    this.savedTime = 0;
    this.shouldAutoPlay = false;
  }

  /**
   * Изменяет качество видео
   */
  async changeQuality(quality: string): Promise<void> {
    console.log('[VideoPlayerController] Changing quality to:', quality);

    // Save current state
    const state = this.stateManager.getState();
    const savedTime = state.currentTime || 0;
    const wasPlaying = state.isPlaying;

    // Set new quality
    if (!this.qualityManager.setSelectedQuality(quality)) {
      return;
    }

    // Get new quality option
    const qualityOption = this.qualityManager.getSelectedQualityOption();
    if (!qualityOption) {
      return;
    }

    // Load new quality with saved state
    await this.shakaManager.loadVideo(qualityOption, savedTime, wasPlaying);
  }

  /**
   * Очищает плеер
   */
  clearPlayer(): void {
    console.log('[VideoPlayerController] Clearing player');

    this.isInitialLoad = true;
    this.savedTime = 0;
    this.shouldAutoPlay = false;
    this.currentPlayerData = null;

    // Stop playback
    if (this.videoElement && !this.videoElement.paused) {
      this.videoElement.pause();
    }

    // Clear thumbnail cache
    this.thumbnailManager.clearCache();

    // Reset managers
    this.stateManager.reset();
    this.qualityManager.reset();
  }

  /**
   * Полностью уничтожает плеер
   */
  async destroyPlayer(): Promise<void> {
    console.log('[VideoPlayerController] Destroying player');

    this.clearPlayer();

    // Unload Shaka Player
    await this.shakaManager.unload();

    // Clear video source
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
      console.error('[VideoPlayerController] Fullscreen error:', error);
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
        console.log('[VideoPlayerController] Video not ready for PiP');
      }
    } catch (error) {
      console.error('[VideoPlayerController] PiP error:', error);
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
   * Полностью уничтожает контроллер
   */
  async destroy(): Promise<void> {
    console.log('[VideoPlayerController] Destroying controller');

    // Disable keyboard
    this.keyboardManager.disable();

    // Detach state manager
    this.stateManager.detach();

    // Destroy thumbnail manager
    this.thumbnailManager.destroy();

    // Destroy Shaka Player
    await this.shakaManager.destroy();

    this.isInitialized = false;
    this.videoElement = null;
    this.containerElement = null;
    this.currentPlayerData = null;
  }
}
