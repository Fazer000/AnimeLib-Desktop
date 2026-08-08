/**
 * Работа со ссылками плеера Kodik
 */

const HLS_MARKER = ':hls:';

export interface KodikSource {
  src: string;
  fallbackSrc: string;
  type: 'progressive' | 'hls';
}

/**
 * Приводит ссылку Kodik к абсолютному виду
 */
export function normalizeKodikUrl(src: string): string {
  return src.startsWith('//') ? `https:${src}` : src;
}

/**
 * Возвращает прямую ссылку на MP4 из HLS-ссылки Kodik
 */
export function toKodikDirectUrl(url: string): string {
  const index = url.indexOf(HLS_MARKER);

  return index > 0 ? url.slice(0, index) : '';
}

/**
 * Выбирает прямой источник Kodik с откатом на HLS
 */
export function resolveKodikSource(src: string): KodikSource {
  const url = normalizeKodikUrl(src);
  const direct = toKodikDirectUrl(url);

  return direct
    ? { src: direct, fallbackSrc: url, type: 'progressive' }
    : { src: url, fallbackSrc: '', type: 'hls' };
}
