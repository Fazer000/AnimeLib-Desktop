/**
 * Акценты сайта сети, выведенные из его единственного фирменного цвета
 * (--primary на сайте): фоны у всех сайтов общие, различается только он
 */
import type { ColorSchemeName } from './themeMode';
import { BLACK, WHITE } from './palette';

/** Насколько осветлить цвет для текста-акцента на тёмном фоне. */
const DARK_SOFT_LIGHTEN = 0.42;
/** Насколько затемнить цвет для текста-акцента на светлом фоне. */
const LIGHT_SOFT_DARKEN = 0.22;
/** Насколько затемнить заливку при наведении. */
const HOVER_DARKEN = 0.2;
/** Насколько развести цвет с белым для шапки светлой схемы. */
const LIGHT_HEADER_TINT = 0.88;
/** Прозрачность подложки выделения в тёмной и светлой схеме. */
const DARK_QUIET_ALPHA = 0.18;
const LIGHT_QUIET_ALPHA = 0.1;

export interface SiteAccent {
  fill: string;
  soft: string;
  hover: string;
  quiet: string;
  rgb: string;
  /** Шапка светлой схемы; в тёмной шапка общая и не меняется */
  header: string | null;
  headerRgb: string | null;
}

/**
 * Каналы цвета #RRGGBB
 */
export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  return [0, 2, 4].map((start) =>
    parseInt(full.slice(start, start + 2), 16),
  ) as [number, number, number];
}

/**
 * Смесь двух цветов: t = 0 — первый, t = 1 — второй
 */
export function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);

  return `#${a
    .map((channel, index) =>
      Math.round(channel + (b[index] - channel) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

const rgbTriplet = (hex: string) => hexToRgb(hex).join(', ');

/**
 * Акценты сайта для схемы: заливка — сам цвет сайта, текст-акцент
 * осветлён на тёмном и затемнён на светлом, чтобы читаться на фоне
 */
export function deriveSiteAccent(
  primary: string,
  scheme: ColorSchemeName,
): SiteAccent {
  const dark = scheme === 'dark';
  const header = dark ? null : mixHex(primary, WHITE, LIGHT_HEADER_TINT);

  return {
    fill: primary.toUpperCase(),
    soft: dark
      ? mixHex(primary, WHITE, DARK_SOFT_LIGHTEN)
      : mixHex(primary, BLACK, LIGHT_SOFT_DARKEN),
    hover: mixHex(primary, BLACK, HOVER_DARKEN),
    quiet: `rgba(${rgbTriplet(primary)}, ${
      dark ? DARK_QUIET_ALPHA : LIGHT_QUIET_ALPHA
    })`,
    rgb: rgbTriplet(primary),
    header,
    headerRgb: header ? rgbTriplet(header) : null,
  };
}
