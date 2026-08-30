import { createLogger } from '../../../shared/logger';

const log = createLogger('VideoStateManager');

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
  onTimeUpdate?: (currentTime: number, buffered: number) => void;
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
    handler: (event: Event) => void;
  }> = [];

  private lastTimeUpdate = 0;

  private lastEmittedDuration = 0;

  private readonly timeUpdateThrottle = 100;

  constructor(config: VideoStateConfig = {}) {
    this.config = config;

    this.state = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: VideoStateManager.loadFromStorage('videoVolume', 1),
      isMuted: VideoStateManager.loadFromStorage('videoMuted', false),
      playbackRate: VideoStateManager.loadFromStorage('videoPlaybackRate', 1),
      isBuffering: false,
    };
  }

  /**
   * Привязывает менеджер к видео элементу
   */
  attach(videoElement: HTMLVideoElement): void {
    this.detach();

    this.videoElement = videoElement;

    videoElement.volume = this.state.volume;
    videoElement.muted = this.state.isMuted;
    videoElement.playbackRate = this.state.playbackRate;

    this.addListener('play', () => this.handlePlay());
    this.addListener('pause', () => this.handlePause());
    this.addListener('timeupdate', () => this.handleTimeUpdate());
    this.addListener('volumechange', () => this.handleVolumeChange());
    this.addListener('loadedmetadata', () => this.handleLoadedMetadata());
    this.addListener('waiting', () => this.handleWaiting());
    this.addListener('canplay', () => this.handleCanPlay());

    log.debug('Attached to video element');
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
      log.debug('Detached from video element');
    }
  }

  /**
   * Добавляет слушатель события
   */
  private addListener(event: string, handler: (event: Event) => void): void {
    this.videoElement?.addEventListener(event, handler);
    this.eventListeners.push({ event, handler });
  }

  private handlePlay(): void {
    log.debug('Play event');
    this.updateState({ isPlaying: true });
  }

  private handlePause(): void {
    log.debug('Pause event');
    this.updateState({ isPlaying: false });
  }

  /**
   * Время и буфер идут отдельным каналом, минуя onStateChange: они меняются
   * десять раз в секунду, а длительность прокидывается только при изменении.
   */
  private handleTimeUpdate(): void {
    if (!this.videoElement) return;

    const now = Date.now();
    if (now - this.lastTimeUpdate < this.timeUpdateThrottle) {
      return;
    }
    this.lastTimeUpdate = now;

    const currentTime = this.videoElement.currentTime || 0;
    const duration = this.videoElement.duration || 0;

    let { buffered } = this.state;
    if (this.videoElement.buffered.length > 0) {
      buffered =
        this.videoElement.buffered.end(this.videoElement.buffered.length - 1) ||
        0;
    }

    this.state = { ...this.state, currentTime, buffered, duration };
    this.emitTimeUpdate();

    if (duration !== this.lastEmittedDuration) {
      this.lastEmittedDuration = duration;
      this.config.onStateChange?.({ duration });
    }
  }

  private emitTimeUpdate(): void {
    this.config.onTimeUpdate?.(this.state.currentTime, this.state.buffered);
  }

  private handleVolumeChange(): void {
    if (!this.videoElement) return;

    const volume = this.videoElement.volume || 1;
    const isMuted = this.videoElement.muted || false;

    this.updateState({ volume, isMuted });

    VideoStateManager.saveToStorage('videoVolume', volume);
    VideoStateManager.saveToStorage('videoMuted', isMuted);
  }

  private handleLoadedMetadata(): void {
    if (!this.videoElement) return;
    log.debug('Metadata loaded');
    this.lastEmittedDuration = this.videoElement.duration || 0;
    this.updateState({
      duration: this.lastEmittedDuration,
      isBuffering: false,
    });
  }

  private handleWaiting(): void {
    log.debug('Video waiting/buffering');
    this.updateState({ isBuffering: true });
  }

  private handleCanPlay(): void {
    log.debug('Can play');
    this.updateState({ isBuffering: false });
  }

  /**
   * Обновляет состояние
   */
  private updateState(updates: Partial<VideoState>): void {
    this.state = { ...this.state, ...updates };
    this.config.onStateChange?.(updates);
  }

  /**
   * Переключает воспроизведение
   */
  togglePlay(): void {
    if (!this.videoElement) return;

    if (this.state.isPlaying) {
      this.videoElement.pause();
    } else {
      this.videoElement.play().catch((error: Error) => {
        log.error('Play error:', error);
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

    VideoStateManager.saveToStorage('videoVolume', clampedVolume);
  }

  /**
   * Переключает mute
   */
  toggleMute(): void {
    if (!this.videoElement) return;

    const newMuted = !this.state.isMuted;
    this.videoElement.muted = newMuted;

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
    VideoStateManager.saveToStorage('videoPlaybackRate', clampedRate);
    log.debug('Playback rate changed to:', clampedRate);
  }

  /**
   * Перематывает на указанное время
   */
  seekTo(time: number): void {
    if (!this.videoElement) return;

    if (!Number.isNaN(time) && time >= 0 && time <= this.state.duration) {
      this.videoElement.currentTime = time;
      this.state = { ...this.state, currentTime: time };
      this.emitTimeUpdate();
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
    this.lastEmittedDuration = 0;
    this.updateState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      isBuffering: false,
    });
    this.emitTimeUpdate();
  }

  /**
   * Получает текущее состояние
   */
  getState(): VideoState {
    return { ...this.state };
  }

  private static loadFromStorage(key: string, defaultValue: any): any {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;

    try {
      return JSON.parse(saved);
    } catch {
      return parseFloat(saved) || defaultValue;
    }
  }

  private static saveToStorage(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
