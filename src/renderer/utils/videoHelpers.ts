import { PLAYER_INSET_X, PLAYER_INSET_Y } from '../../constants';

/**
 * Возвращает CSS-ширину блока с заданным соотношением сторон,
 * вписанного в размерный контейнер (container-type: size)
 */
export function getFittedWidth(aspectRatio: number): string {
  const ratio = aspectRatio.toFixed(4);
  return `min(calc(100cqw - ${PLAYER_INSET_X}px), calc((100cqh - ${PLAYER_INSET_Y}px) * ${ratio}))`;
}

/**
 * Форматирует время в формат MM:SS
 */
export function formatTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) {
    return '0:00';
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Определяет иконку качества по разрешению
 */
export function getQualityLevel(quality: string): '4K' | 'HD' | 'SD' {
  const qualityNum = parseInt(quality.replace('p', ''), 10);

  if (qualityNum >= 2160) return '4K';
  if (qualityNum >= 720) return 'HD';
  return 'SD';
}

/**
 * Вычисляет процент буферизации
 */
export function calculateBufferedPercent(
  buffered: number,
  duration: number,
): number {
  if (duration === 0) return 0;
  return (buffered / duration) * 100;
}

/**
 * Вычисляет процент прогресса
 */
export function calculateProgressPercent(
  currentTime: number,
  duration: number,
): number {
  if (duration === 0) return 0;
  return (currentTime / duration) * 100;
}

/**
 * Загружает значение из localStorage
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  const saved = localStorage.getItem(key);
  if (saved === null) return defaultValue;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Сохраняет значение в localStorage
 */
export function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
