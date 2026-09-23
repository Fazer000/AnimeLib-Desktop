/**
 * Серия ежедневных входов автора комментария: правила показа и цвета значка
 */
import {
  LOGIN_STREAK_DEFAULT_STYLES,
  LOGIN_STREAK_MIN_DAYS,
  LOGIN_STREAK_TIER_LIMITS,
  LoginStreakTier,
} from '../../constants';
import {
  LOGIN_STREAK_DARK_PALETTES,
  LOGIN_STREAK_LIGHT_PALETTES,
  LoginStreakColors,
  LoginStreakGradientColors,
} from '../theme/palette';
import { pluralRu } from './plural';

export interface LoginStreakInfo {
  login_streak?: number | null;
  max_login_streak?: number | null;
  last_login_at?: string | null;
}

export interface LoginStreakPreferences {
  login_streak_dark_icon_style?: string | null;
  login_streak_light_icon_style?: string | null;
  login_streak_theme?: string | null;
}

export type StreakScheme = 'light' | 'dark';

export type StreakValueSize = 'normal' | 'compact' | 'ultra';

/**
 * Разбирает время сайта «2026-09-23 22:45:50» как местное
 */
function parseSiteTime(value: string): Date | null {
  const date = new Date(value.trim().replace(' ', 'T'));

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Длина действующей серии: не короче порога и со входом не раньше вчерашнего дня.
 * Прерванная серия значка не даёт
 */
export function getActiveStreak(
  info: LoginStreakInfo | null | undefined,
  now: Date = new Date(),
): number | null {
  const days = info?.login_streak ?? 0;

  if (days < LOGIN_STREAK_MIN_DAYS || !info?.last_login_at) return null;

  const lastLogin = parseSiteTime(info.last_login_at);

  if (!lastLogin) return null;

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );

  return lastLogin < yesterday ? null : days;
}

/**
 * Уровень серии по её длине
 */
export function getStreakTier(days: number): LoginStreakTier {
  const match = LOGIN_STREAK_TIER_LIMITS.find(([limit]) => days <= limit);

  return match ? match[1] : 'legend';
}

/**
 * Число на значке: с тысячи дней — «1k»
 */
export function formatStreakValue(days: number): string {
  return days >= 1000 ? `${Math.floor(days / 1000)}k` : String(days);
}

/**
 * Размер числа на значке: длинные числа ужимаются
 */
export function getStreakValueSize(value: string): StreakValueSize {
  if (value.length >= 4) return 'ultra';
  if (value.length === 3) return 'compact';

  return 'normal';
}

/**
 * Тема значка: закреплённая автором, иначе тема приложения
 */
export function resolveStreakScheme(
  preferences: LoginStreakPreferences | null | undefined,
  appScheme: StreakScheme,
): StreakScheme {
  const theme = preferences?.login_streak_theme;

  return theme === 'light' || theme === 'dark' ? theme : appScheme;
}

/**
 * Цвета значка по личному стилю автора. Неизвестный стиль заменяется
 * стандартным, как на сайте
 */
export function resolveStreakColors(
  preferences: LoginStreakPreferences | null | undefined,
  tier: LoginStreakTier,
  appScheme: StreakScheme,
): LoginStreakColors {
  if (resolveStreakScheme(preferences, appScheme) === 'dark') {
    const style = preferences?.login_streak_dark_icon_style ?? '';

    return (
      LOGIN_STREAK_DARK_PALETTES[style]?.[tier] ??
      LOGIN_STREAK_DARK_PALETTES[LOGIN_STREAK_DEFAULT_STYLES.dark][tier]
    );
  }

  const style = preferences?.login_streak_light_icon_style ?? '';

  return (
    LOGIN_STREAK_LIGHT_PALETTES[style]?.[tier] ??
    LOGIN_STREAK_LIGHT_PALETTES[LOGIN_STREAK_DEFAULT_STYLES.light][tier]
  );
}

/**
 * Премиальные стили закрашивают значок градиентом
 */
export function isGradientColors(
  colors: LoginStreakColors,
): colors is LoginStreakGradientColors {
  return colors.length === 5;
}

/**
 * Подсказка значка: «Текущая серия: 26 дней»
 */
export function formatStreakTooltip(days: number): string {
  return `Текущая серия: ${days} ${pluralRu(days, ['день', 'дня', 'дней'])}`;
}
