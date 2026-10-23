/** Заранее подгружает MP4-источник в скрытое видео с нужной позиции */
import { createLogger } from '../../../shared/logger';

const log = createLogger('SourcePreloader');

const READY_HAVE_FUTURE_DATA = 3;

/** Ждёт, пока скрытое видео будет готово играть с позиции time */
export function preloadProgressiveSource(
  src: string,
  time: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';

    let timer = 0;

    const finish = (ready: boolean) => {
      window.clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      log.debug('Preload finished:', ready);
      resolve(ready);
    };

    const checkReady = () => {
      if (!video.seeking && video.readyState >= READY_HAVE_FUTURE_DATA) {
        finish(true);
      }
    };

    video.addEventListener(
      'loadedmetadata',
      () => {
        video.currentTime = Math.min(time, video.duration || time);
      },
      { once: true },
    );
    video.addEventListener('seeked', checkReady);
    video.addEventListener('canplay', checkReady);
    video.addEventListener('error', () => finish(false), { once: true });

    timer = window.setTimeout(() => finish(false), timeoutMs);
    video.src = src;
  });
}

export default preloadProgressiveSource;
