import {
  PLAYER_INSET_X,
  PLAYER_INSET_Y,
  PLAYER_WIDTH_SNAP_PX,
  SCROLLBAR_WIDTH,
} from '../../constants';
import {
  QUALITY_FHD,
  INFO_BRIGHT,
  QUALITY_4K,
  QUALITY_SD,
} from '../theme/palette';

/** Возвращает CSS-ширину блока с заданным соотношением сторон */
export function getFittedWidth(aspectRatio: number): string {
  const ratio = aspectRatio.toFixed(4);
  return `round(down, min(calc(100cqw - ${PLAYER_INSET_X}px), calc((100cqh - ${PLAYER_INSET_Y}px) * ${ratio})), ${PLAYER_WIDTH_SNAP_PX}px)`;
}

/** Возвращает CSS-высоту ряда «кадр и сайдбар»: её задаёт кадр, пока хватает окна по высоте */
export function getPlayerRowHeight(
  aspectRatio: number,
  sidebarWidth: string,
  reservedHeight: number,
): string {
  const ratio = aspectRatio.toFixed(4);
  const byWidth = `calc((100vw - ${sidebarWidth} - ${SCROLLBAR_WIDTH}px) / ${ratio})`;
  const byHeight = `calc(100vh - ${reservedHeight}px)`;

  return `min(${byWidth}, ${byHeight})`;
}

/** Возвращает отрезок прокрутки, на котором лист страницы наезжает на закреплённый блок */
export function getCoverRange(
  gap: number,
  pinnedHeight: string,
): { start: string; end: string } {
  return { start: `${gap}px`, end: `calc(${gap}px + ${pinnedHeight})` };
}

/** Возвращает CSS-высоту вписанного видео для контейнера-строки */
export function getFittedHeight(
  aspectRatio: number,
  sidebarWidth: string,
): string {
  const ratio = aspectRatio.toFixed(4);
  return `min(calc((100cqw - ${sidebarWidth} - ${PLAYER_INSET_X}px) / ${ratio}), calc(100cqh - ${PLAYER_INSET_Y}px))`;
}

/**
 * Возвращает положение и ширину сегмента на шкале в процентах длительности
 */
export function getSegmentBounds(
  start: number,
  end: number,
  duration: number,
): { left: number; width: number } {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { left: 0, width: 0 };
  }

  const from = Math.min(Math.max(start, 0), duration);
  const to = Math.min(Math.max(end, 0), duration);

  return {
    left: (from / duration) * 100,
    width: (Math.max(to - from, 0) / duration) * 100,
  };
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
  '4K': QUALITY_4K,
  FHD: QUALITY_FHD,
  HD: INFO_BRIGHT,
  SD: QUALITY_SD,
};

/**
 * Возвращает цвет метки качества
 */
export function getQualityTagColor(tag: string): string {
  return QUALITY_TAG_COLORS[tag] || QUALITY_FHD;
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
