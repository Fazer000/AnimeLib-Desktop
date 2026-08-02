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
 * Возвращает CSS-высоту вписанного видео для контейнера-строки,
 * где рядом расположен сайдбар заданной ширины (container-type: size)
 */
export function getFittedHeight(
  aspectRatio: number,
  sidebarWidth: string,
): string {
  const ratio = aspectRatio.toFixed(4);
  return `min(calc((100cqw - ${sidebarWidth} - ${PLAYER_INSET_X}px) / ${ratio}), calc(100cqh - ${PLAYER_INSET_Y}px))`;
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
 * Возвращает метку качества (4K, FHD, HD, SD) по разрешению
 */
export function getQualityTagFromResolution(quality: string): string {
  const qualityNum = parseInt(quality.replace('p', ''), 10);

  if (Number.isNaN(qualityNum)) return '';
  if (qualityNum >= 2160) return '4K';
  if (qualityNum >= 1080) return 'FHD';
  if (qualityNum >= 720) return 'HD';
  return 'SD';
}

/**
 * Цвета меток качества для визуального различения
 */
export const QUALITY_TAG_COLORS: Record<string, string> = {
  '4K': '#F5A623',
  FHD: '#8B5CF6',
  HD: '#3B82F6',
  SD: '#9CA3AF',
};

/**
 * Возвращает цвет метки качества
 */
export function getQualityTagColor(tag: string): string {
  return QUALITY_TAG_COLORS[tag] || '#8B5CF6';
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
