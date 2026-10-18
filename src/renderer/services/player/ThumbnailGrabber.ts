import {
  THUMBNAIL_HEIGHT,
  THUMBNAIL_SEEK_TIMEOUT_MS,
  THUMBNAIL_WIDTH,
} from '../../../constants';
import { isFrameReady } from '../../utils/thumbnailGrid';

const JPEG_QUALITY = 0.7;

/**
 * Снимает кадры из собственного скрытого видео: перематывает и ждёт, пока
 * кадр действительно готов. Запросы к одному экземпляру идут по очереди
 */
class ThumbnailGrabber {
  private src: string | null = null;

  private video: HTMLVideoElement | null = null;

  private loading: Promise<HTMLVideoElement> | null = null;

  private readonly canvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D | null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = THUMBNAIL_WIDTH;
    this.canvas.height = THUMBNAIL_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  /**
   * Меняет источник; скрытое видео создаётся при первом кадре
   */
  setSource(src: string | null): void {
    if (this.src === src) return;

    this.dispose();
    this.src = src;
  }

  /**
   * Готовит кадр момента time и отдаёт его как JPEG data URL
   */
  async grab(time: number): Promise<string> {
    if (!this.ctx) {
      throw new Error('Canvas not initialized');
    }

    const video = await this.ensureVideo();

    if (!isFrameReady(video, time)) {
      const alreadyHeading =
        video.seeking && Math.abs(video.currentTime - time) < 0.5;

      if (!alreadyHeading) {
        video.currentTime = time;
      }

      try {
        await ThumbnailGrabber.waitSeeked(video);
      } catch (error) {
        if (this.video === video) this.dispose();
        throw error;
      }

      if (!isFrameReady(video, time)) {
        throw new Error('Frame not ready');
      }
    }

    this.ctx.drawImage(video, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    return this.canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  /**
   * Освобождает скрытое видео и сетевое соединение
   */
  dispose(): void {
    if (this.video) {
      this.video.removeAttribute('src');
      this.video.load();
      this.video.remove();
    }

    this.video = null;
    this.loading = null;
  }

  /**
   * Создаёт скрытое видео с источником и ждёт его метаданных
   */
  private ensureVideo(): Promise<HTMLVideoElement> {
    if (this.video) return Promise.resolve(this.video);
    if (this.loading) return this.loading;

    const { src } = this;
    if (!src) return Promise.reject(new Error('No video source'));

    this.loading = new Promise<HTMLVideoElement>((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.style.cssText =
        'display:none;position:absolute;pointer-events:none;';

      const fail = () => {
        video.remove();
        if (this.src === src) this.loading = null;
        reject(new Error('Seek video load error'));
      };

      const timer = setTimeout(fail, THUMBNAIL_SEEK_TIMEOUT_MS);

      video.addEventListener(
        'loadedmetadata',
        () => {
          clearTimeout(timer);

          if (this.src !== src) {
            video.remove();
            reject(new Error('Source changed'));
            return;
          }

          this.video = video;
          resolve(video);
        },
        { once: true },
      );

      video.addEventListener(
        'error',
        () => {
          clearTimeout(timer);
          fail();
        },
        { once: true },
      );

      video.src = src;
      document.body.appendChild(video);
    });

    return this.loading;
  }

  /**
   * Ждёт окончания перемотки; по таймауту — ошибка, а не старый кадр
   */
  private static waitSeeked(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;

      const onSeeked = () => {
        if (timer) clearTimeout(timer);
        resolve();
      };

      timer = setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        reject(new Error('Seek timeout'));
      }, THUMBNAIL_SEEK_TIMEOUT_MS);

      video.addEventListener('seeked', onSeeked, { once: true });
    });
  }
}

export default ThumbnailGrabber;
