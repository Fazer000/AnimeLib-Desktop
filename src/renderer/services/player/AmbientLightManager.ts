/**
 * Отражение кадра в маленький буфер: свечение даёт растяжение битмапа,
 * поэтому размытие считается по буферу, а не по слою во всю область
 */
import {
  AMBIENT_FRAME_INTERVAL_MS,
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

export default class AmbientLightManager {
  private canvas: HTMLCanvasElement | null = null;

  private ctx: CanvasRenderingContext2D | null = null;

  private video: FrameCallbackVideo | null = null;

  private handle: number | null = null;

  private usesFrameCallback: boolean = false;

  private lastDrawAt: number = 0;

  /**
   * Привязывает буфер, в который отражается кадр
   */
  public attach(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      log.error('Failed to get 2D context for ambient canvas');
      return;
    }

    canvas.width = BUFFER.width;
    canvas.height = BUFFER.height;
    ctx.filter = buildSourceFilter(
      AMBIENT_SOURCE_BLUR,
      AMBIENT_SOURCE_SATURATION,
    );

    this.canvas = canvas;
    this.ctx = ctx;
  }

  /**
   * Берёт видео под наблюдение и запускает цикл, если оно играет
   */
  public start(video: HTMLVideoElement, isPlaying: boolean): void {
    this.stop();

    const source = video as FrameCallbackVideo;

    this.video = source;
    this.usesFrameCallback =
      typeof source.requestVideoFrameCallback === 'function';
    this.lastDrawAt = 0;

    source.addEventListener('seeked', this.handleFrameChange);
    source.addEventListener('loadeddata', this.handleFrameChange);

    this.draw();

    if (isPlaying) {
      this.schedule();
    }

    log.debug('Started, frame callback:', this.usesFrameCallback);
  }

  /**
   * Останавливает цикл и отпускает видео
   */
  public stop(): void {
    this.cancel();

    this.video?.removeEventListener('seeked', this.handleFrameChange);
    this.video?.removeEventListener('loadeddata', this.handleFrameChange);
    this.video = null;
  }

  /**
   * Гасит свечение
   */
  public reset(): void {
    const { ctx, canvas } = this;

    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  public dispose(): void {
    this.stop();
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Отражает текущий кадр вне цикла: перемотка и смена источника
   */
  private handleFrameChange = (): void => {
    this.draw();
  };

  /**
   * Отражает кадр в буфер
   */
  private draw(): void {
    const { ctx, canvas, video } = this;

    if (
      !ctx ||
      !canvas ||
      !video ||
      video.readyState < READY_HAVE_CURRENT_DATA ||
      !video.videoWidth
    ) {
      return;
    }

    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        video,
        SOURCE_RECT.x,
        SOURCE_RECT.y,
        SOURCE_RECT.width,
        SOURCE_RECT.height,
      );
    } catch (error) {
      log.error('Frame draw failed:', error);
    }
  }

  /**
   * Шаг цикла: кадры чаще промежутка пропускаются
   */
  private tick = (time: number): void => {
    const { video } = this;

    if (!video) {
      this.handle = null;
      return;
    }

    if (shouldDrawFrame(time, this.lastDrawAt, AMBIENT_FRAME_INTERVAL_MS)) {
      this.lastDrawAt = time;
      this.draw();
    }

    if (!this.usesFrameCallback && (video.paused || video.ended)) {
      this.handle = null;
      return;
    }

    this.schedule();
  };

  /**
   * Ставит следующий шаг: по декодированным кадрам, иначе по кадрам отрисовки
   */
  private schedule(): void {
    const { video } = this;

    if (!video) {
      return;
    }

    if (this.usesFrameCallback && video.requestVideoFrameCallback) {
      this.handle = video.requestVideoFrameCallback(this.tick);
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
      this.video?.cancelVideoFrameCallback?.(this.handle);
    } else {
      cancelAnimationFrame(this.handle);
    }

    this.handle = null;
  }
}
