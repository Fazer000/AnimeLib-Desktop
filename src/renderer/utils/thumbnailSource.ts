/**
 * Источник для кадров превью: самое лёгкое прогрессивное качество
 */
import type { QualityOption } from '../services/player/ShakaPlayerManager';

/**
 * Высота кадра из значения качества («720p», «1080p (оффлайн)»)
 */
const heightOf = (option: QualityOption): number => {
  const height = parseInt(option.value, 10);

  return Number.isNaN(height) ? Infinity : height;
};

/**
 * Адрес самого низкого прогрессивного качества: перемотка по нему быстрее,
 * а для маленькой картинки разницы не видно. null — подходящих вариантов нет
 */
export function pickThumbnailSource(options: QualityOption[]): string | null {
  const progressive = options.filter((option) => option.type === 'progressive');

  if (progressive.length === 0) {
    return null;
  }

  return progressive.reduce((lowest, option) =>
    heightOf(option) < heightOf(lowest) ? option : lowest,
  ).src;
}

export default pickThumbnailSource;
