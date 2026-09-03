/**
 * Режим темы и его разрешение в конкретную схему.
 * Повторяет три состояния сайта: системное и два явных.
 */

/** Режим, выбранный на сайте. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Схема, которую приложение показывает после разрешения режима. */
export type ColorSchemeName = 'light' | 'dark';

/** Все допустимые режимы в порядке следования на сайте. */
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Режим, применяемый до того, как сайт сообщит свой. */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

const MODE_ALIASES: Record<string, ThemeMode> = {
  system: 'system',
  auto: 'system',
  light: 'light',
  day: 'light',
  dark: 'dark',
  night: 'dark',
};

/** Приводит значение из хранилища сайта к режиму, неизвестное считает системным. */
export function normalizeThemeMode(value: unknown): ThemeMode {
  if (typeof value !== 'string') return 'system';

  return MODE_ALIASES[value.trim().toLowerCase()] ?? 'system';
}

/** Разрешает режим в схему, опираясь на системное предпочтение для 'system'. */
export function resolveColorScheme(
  mode: ThemeMode,
  prefersDark: boolean,
): ColorSchemeName {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';

  return prefersDark ? 'dark' : 'light';
}

/** Проверяет, что значение является режимом темы. */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.includes(value as ThemeMode);
}
