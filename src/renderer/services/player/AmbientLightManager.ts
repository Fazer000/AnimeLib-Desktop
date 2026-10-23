/** Отражение кадра в маленький буфер */
import {
  AMBIENT_FRAME_INTERVAL_MS,
  AMBIENT_SOURCE_RESET_DELAY_MS,
  AMBIENT_SOURCE_BLUR,
  AMBIENT_SOURCE_HEIGHT,
  AMBIENT_SOURCE_MARGIN,
  AMBIENT_SOURCE_SATURATION,
  AMBIENT_SOURCE_WIDTH,
} from '../../../constants';
import {
  buildSourceFilter,
  getBufferSize,
  getSourceRect,
  shouldDrawFrame,
} from '../../utils/ambientFrame';

import { createLogger } from '../../../shared/logger';

const log = createLogger('AmbientLightManager');

const READY_HAVE_CURRENT_DATA = 2;

const BUFFER = getBufferSize(
  AMBIENT_SOURCE_WIDTH,
  AMBIENT_SOURCE_HEIGHT,
  AMBIENT_SOURCE_MARGIN,
);

const SOURCE_RECT = getSourceRect(
  AMBIENT_SOURCE_WIDTH,
  AMBIENT_SOURCE_HEIGHT,
  AMBIENT_SOURCE_MARGIN,
);

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (time: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

const PLAYBACK_EVENTS = ['play', 'pause', 'ended'] as const;
const FRAME_EVENTS = ['seeked', 'loadeddata'] as const;

export default class AmbientLightManager {
  private static readonly shared = new Map<
    HTMLVideoElement,
    { manager: AmbientLightManager; users: number }
  >();

  private readonly video: FrameCallbackVideo;

  private readonly buffer: HTMLCanvasElement;

  private readonly bufferCtx: CanvasRenderingContext2D | null;

  private readonly targets = new Set<CanvasRenderingContext2D>();

  private readonly usesFrameCallback: boolean;

  private handle: number | null = null;

  private lastDrawAt: number = 0;

  private resetTimer: number = 0;

  private held: boolean = false;

  private constructor(video: HTMLVideoElement) {
    this.video = video as FrameCallbackVideo;
    this.usesFrameCallback =
      typeof this.video.requestVideoFrameCallback === 'function';

    this.buffer = document.createElement('canvas');
    this.buffer.width = BUFFER.width;
    this.buffer.height = BUFFER.height;
    this.bufferCtx = this.buffer.getContext('2d');

    if (this.bufferCtx) {
      this.bufferCtx.filter = buildSourceFilter(
        AMBIENT_SOURCE_BLUR,
        AMBIENT_SOURCE_SATURATION,
      );
    } else {
      log.error('Failed to get 2D context for ambient buffer');
    }

    PLAYBACK_EVENTS.forEach((name) =>
      this.video.addEventListener(name, this.handlePlayback),
    );
    FRAME_EVENTS.forEach((name) =>
      this.video.addEventListener(name, this.handleFrameChange),
    );
    this.video.addEventListener('emptied', this.handleSourceReset);

    this.draw();
    this.handlePlayback();
    log.debug('Started, frame callback:', this.usesFrameCallback);
  }

  /**
   * Общее отражение кадра для видео; каждый вызов парный с release
   */
  public static acquire(video: HTMLVideoElement): AmbientLightManager {
    const entry = AmbientLightManager.shared.get(video);

    if (entry) {
      entry.users += 1;
      return entry.manager;
    }

    const manager = new AmbientLightManager(video);
    AmbientLightManager.shared.set(video, { manager, users: 1 });
    return manager;
  }

  /**
   * Отпускает отражение; последний пользователь его останавливает
   */
  public static release(video: HTMLVideoElement): void {
    const entry = AmbientLightManager.shared.get(video);
    if (!entry) return;

    entry.users -= 1;
    if (entry.users > 0) return;

    AmbientLightManager.shared.delete(video);
    entry.manager.dispose();
  }

  /** Замораживает подсветку видео на последнем кадре, пока источник перезагружается */
  public static hold(video: HTMLVideoElement, held: boolean): void {
    AmbientLightManager.shared.get(video)?.manager.setHeld(held);
  }

  /**
   * Подключает холст подсветки к общему буферу; возвращает отключение
   */
  public attach(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      log.error('Failed to get 2D context for ambient canvas');
      return () => {};
    }

    canvas.width = BUFFER.width;
    canvas.height = BUFFER.height;
    this.targets.add(ctx);
    this.copyTo(ctx);

    return () => {
      this.targets.delete(ctx);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  private dispose(): void {
    this.cancel();
    PLAYBACK_EVENTS.forEach((name) =>
      this.video.removeEventListener(name, this.handlePlayback),
    );
    FRAME_EVENTS.forEach((name) =>
      this.video.removeEventListener(name, this.handleFrameChange),
    );
    this.video.removeEventListener('emptied', this.handleSourceReset);
    window.clearTimeout(this.resetTimer);
    this.targets.clear();
  }

  /**
   * Цикл идёт, только пока видео играет
   */
  private handlePlayback = (): void => {
    if (this.video.paused || this.video.ended) {
      this.cancel();
      return;
    }

    if (this.handle === null) {
      this.lastDrawAt = 0;
      this.schedule();
    }
  };

  /**
   * Отражает текущий кадр вне цикла: перемотка и смена источника
   */
  private handleFrameChange = (): void => {
    this.draw();
  };

  /** Смена источника: свечение прошлого видео гаснет, если новый кадр не пришёл за паузу */
  private setHeld(held: boolean): void {
    this.held = held;
    window.clearTimeout(this.resetTimer);
    if (!held) this.draw();
  }

  private handleSourceReset = (): void => {
    window.clearTimeout(this.resetTimer);
    if (this.held) return;

    this.resetTimer = window.setTimeout(() => {
      this.bufferCtx?.clearRect(0, 0, this.buffer.width, this.buffer.height);
      this.targets.forEach((ctx) => this.copyTo(ctx));
    }, AMBIENT_SOURCE_RESET_DELAY_MS);
  };

  /**
   * Отражает кадр в буфер и раздаёт его подсветкам
   */
  private draw(): void {
    const { bufferCtx, buffer, video } = this;

    if (
      this.held ||
      !bufferCtx ||
      video.readyState < READY_HAVE_CURRENT_DATA ||
      !video.videoWidth
    ) {
      return;
    }

    window.clearTimeout(this.resetTimer);

    try {
      bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
      bufferCtx.drawImage(
        video,
        SOURCE_RECT.x,
        SOURCE_RECT.y,
        SOURCE_RECT.width,
        SOURCE_RECT.height,
      );
      this.targets.forEach((ctx) => this.copyTo(ctx));
    } catch (error) {
      log.error('Frame draw failed:', error);
    }
  }

  private copyTo(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, BUFFER.width, BUFFER.height);
    ctx.drawImage(this.buffer, 0, 0);
  }

  /**
   * Шаг цикла: кадры чаще промежутка пропускаются
   */
  private tick = (time: number): void => {
    this.handle = null;

    if (shouldDrawFrame(time, this.lastDrawAt, AMBIENT_FRAME_INTERVAL_MS)) {
      this.lastDrawAt = time;
      this.draw();
    }

    if (!this.video.paused && !this.video.ended) {
      this.schedule();
    }
  };

  /**
   * Ставит следующий шаг: по декодированным кадрам, иначе по кадрам отрисовки
   */
  private schedule(): void {
    if (this.usesFrameCallback && this.video.requestVideoFrameCallback) {
      this.handle = this.video.requestVideoFrameCallback(this.tick);
      return;
    }

    this.handle = requestAnimationFrame(this.tick);
  }

  /**
   * Снимает запланированный шаг
   */
  private cancel(): void {
    if (this.handle === null) {
      return;
    }

    if (this.usesFrameCallback) {
      this.video.cancelVideoFrameCallback?.(this.handle);
    } else {
      cancelAnimationFrame(this.handle);
    }

    this.handle = null;
  }
}
