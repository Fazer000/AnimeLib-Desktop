import { WATCH_VIEW_THRESHOLD } from '../../constants';

/** Засчитать ли серию: порог пройден и после перемотки было воспроизведение */
export default function shouldMarkViewed(
  position: number,
  duration: number,
  playedSinceSeek: number,
): boolean {
  if (duration <= 0) return false;

  return position / duration >= WATCH_VIEW_THRESHOLD && playedSinceSeek > 0;
}
