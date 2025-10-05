/* eslint-disable no-console */

export interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isBuffering: boolean;
}

export interface VideoStateConfig {
  onStateChange?: (state: Partial<VideoState>) => void;
}

/**
 * Управляет состоянием воспроизведения видео
 */
export class VideoStateManager {
  private state: VideoState;

  private videoElement: HTMLVideoElement | null = null;

  private config: VideoStateConfig;

  private eventListeners: Array<{
    event: string;
    handler: EventListener;
  }> = [];

  constructor(config: VideoStateConfig = {}) {
    this.config = config;

    // Initialize state with saved values
    this.state = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: this.loadFromStorage('videoVolume', 1),
      isMuted: this.loadFromStorage('videoMuted', false),
      playbackRate: this.loadFromStorage('videoPlaybackRate', 1),
      isBuffering: false,
    };
  }

  /**
   * Привязывает менеджер к видео элементу
   */
  attach(videoElement: HTMLVideoElement): void {
    this.detach(); // Remove previous listeners

    this.videoElement = videoElement;

    // Apply saved settings
    videoElement.volume = this.state.volume;
    videoElement.muted = this.state.isMuted;
    videoElement.playbackRate = this.state.playbackRate;

    // Setup event listeners
    this.addListener('play', () => this.handlePlay());
    this.addListener('pause', () => this.handlePause());
    this.addListener('timeupdate', () => this.handleTimeUpdate());
    this.addListener('volumechange', () => this.handleVolumeChange());
    this.addListener('loadedmetadata', () => this.handleLoadedMetadata());
    this.addListener('waiting', () => this.handleWaiting());
    this.addListener('canplay', () => this.handleCanPlay());

    console.log('[VideoStateManager] Attached to video element');
  }

  /**
   * Отвязывает менеджер от видео элемента
   */
  detach(): void {
    if (this.videoElement) {
      this.eventListeners.forEach(({ event, handler }) => {
        this.videoElement?.removeEventListener(event, handler);
      });
      this.eventListeners = [];
      this.videoElement = null;
      console.log('[VideoStateManager] Detached from video element');
    }
  }

  /**
   * Добавляет слушатель события
   */
  private addListener(event: string, handler: EventListener): void {
    this.videoElement?.addEventListener(event, handler);
    this.eventListeners.push({ event, handler });
  }

  // Event handlers
  private handlePlay(): void {
    console.log('[VideoStateManager] Play event');
    this.updateState({ isPlaying: true });
  }

  private handlePause(): void {
    console.log('[VideoStateManager] Pause event');
    this.updateState({ isPlaying: false });
  }

  private handleTimeUpdate(): void {
    if (!this.videoElement) return;

    const updates: Partial<VideoState> = {
      currentTime: this.videoElement.currentTime || 0,
      duration: this.videoElement.duration || 0,
    };

    // Update buffered
    if (this.videoElement.buffered.length > 0) {
      const bufferedEnd = this.videoElement.buffered.end(
        this.videoElement.buffered.length - 1,
      );
      updates.buffered = bufferedEnd || 0;
    }

    this.updateState(updates);
  }

  private handleVolumeChange(): void {
    if (!this.videoElement) return;

    const volume = this.videoElement.volume || 1;
    const isMuted = this.videoElement.muted || false;

    this.updateState({ volume, isMuted });

    // Save to localStorage
    this.saveToStorage('videoVolume', volume);
    this.saveToStorage('videoMuted', isMuted);
  }

  private handleLoadedMetadata(): void {
    if (!this.videoElement) return;
    console.log('[VideoStateManager] Metadata loaded');
    this.updateState({
      duration: this.videoElement.duration || 0,
      isBuffering: false,
    });
  }

  private handleWaiting(): void {
    console.log('[VideoStateManager] Video waiting/buffering');
    this.updateState({ isBuffering: true });
  }

  private handleCanPlay(): void {
    console.log('[VideoStateManager] Can play');
    this.updateState({ isBuffering: false });
  }

  /**
   * Обновляет состояние
   */
  private updateState(updates: Partial<VideoState>): void {
    this.state = { ...this.state, ...updates };
    this.config.onStateChange?.(updates);
  }

  // Public control methods

  /**
   * Переключает воспроизведение
   */
  togglePlay(): void {
    if (!this.videoElement) return;

    if (this.state.isPlaying) {
      this.videoElement.pause();
    } else {
      this.videoElement.play().catch((error: Error) => {
        console.error('[VideoStateManager] Play error:', error);
      });
    }
  }

  /**
   * Устанавливает громкость
   */
  setVolume(volume: number): void {
    if (!this.videoElement) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.videoElement.volume = clampedVolume;

    if (clampedVolume === 0) {
      this.videoElement.muted = true;
    } else if (this.state.isMuted) {
      this.videoElement.muted = false;
    }

    this.saveToStorage('videoVolume', clampedVolume);
  }

  /**
   * Переключает mute
   */
  toggleMute(): void {
    if (!this.videoElement) return;

    const newMuted = !this.state.isMuted;
    this.videoElement.muted = newMuted;

    // If unmuting and volume is 0, set to 0.5
    if (!newMuted && this.state.volume === 0) {
      this.setVolume(0.5);
    }
  }

  /**
   * Устанавливает скорость воспроизведения
   */
  setPlaybackRate(rate: number): void {
    if (!this.videoElement) return;

    const clampedRate = Math.max(0.25, Math.min(2, rate));
    this.videoElement.playbackRate = clampedRate;
    this.updateState({ playbackRate: clampedRate });
    this.saveToStorage('videoPlaybackRate', clampedRate);
    console.log('[VideoStateManager] Playback rate changed to:', clampedRate);
  }

  /**
   * Перематывает на указанное время
   */
  seekTo(time: number): void {
    if (!this.videoElement) return;

    if (!Number.isNaN(time) && time >= 0 && time <= this.state.duration) {
      this.videoElement.currentTime = time;
      this.updateState({ currentTime: time });
    }
  }

  /**
   * Перематывает вперед/назад
   */
  skip(seconds: number): void {
    if (!this.videoElement) return;

    const newTime = Math.max(
      0,
      Math.min(this.state.duration, this.state.currentTime + seconds),
    );
    this.seekTo(newTime);
  }

  /**
   * Перематывает на процент от длительности
   */
  seekToPercent(percent: number): void {
    if (!this.videoElement || this.state.duration === 0) return;

    const time = (percent / 100) * this.state.duration;
    this.seekTo(time);
  }

  /**
   * Сбрасывает состояние
   */
  reset(): void {
    this.updateState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      isBuffering: false,
    });
  }

  /**
   * Получает текущее состояние
   */
  getState(): VideoState {
    return { ...this.state };
  }

  // Storage helpers

  private loadFromStorage(key: string, defaultValue: any): any {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;

    try {
      return JSON.parse(saved);
    } catch {
      return parseFloat(saved) || defaultValue;
    }
  }

  private saveToStorage(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
