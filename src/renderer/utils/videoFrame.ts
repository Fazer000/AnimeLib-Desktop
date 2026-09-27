/**
 * Снимок текущего кадра видео и ожидание следующего показанного кадра
 */
import { getContainRect } from './upscaleGeometry';

const READY_HAVE_CURRENT_DATA = 2;

const FRAME_ADVANCE_S = 0.05;

/**
 * Рисует текущий кадр в холст с теми же полями, что у видео на экране.
 * false — кадра нет или его нельзя прочитать
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): boolean {
  if (video.readyState < READY_HAVE_CURRENT_DATA || !video.videoWidth) {
    return false;
  }

  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  canvas.width = width;
  canvas.height = height;

  const rect = getContainRect(
    width,
    height,
    video.videoWidth,
    video.videoHeight,
  );

  try {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, rect.x, rect.y, rect.width, rect.height);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ждёт, пока новый источник действительно покажет картинку: у игравшего
 * видео — пока время не сдвинется от позиции переключения, у стоявшего
 * на паузе — пока кадр в нужной позиции не будет готов. Не дольше timeoutMs
 */
export function waitForVideoFrame(
  video: HTMLVideoElement,
  startTime: number,
  expectPlaying: boolean,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = performance.now();

    const shown = () => {
      if (video.seeking || video.readyState < READY_HAVE_CURRENT_DATA) {
        return false;
      }

      return expectPlaying
        ? !video.paused && video.currentTime > startTime + FRAME_ADVANCE_S
        : true;
    };

    const check = () => {
      if (performance.now() - startedAt > timeoutMs) {
        resolve();
        return;
      }

      if (shown()) {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}
