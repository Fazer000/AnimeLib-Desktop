/**
 * Режимы улучшения картинки: стартовый уровень, понижение в «Авто» и подписи
 */
import {
  UPSCALE_AUTO_BAD_WINDOWS,
  UPSCALE_AUTO_HEADROOM,
  UPSCALE_AUTO_OVER_BUDGET_SHARE,
  UPSCALE_AUTO_SEVERE_FACTOR,
  UPSCALE_AUTO_START_PRESET,
  UPSCALE_MODES,
  UPSCALE_PRESETS,
  UpscaleMode,
  UpscalePreset,
} from '../../constants';

const MODE_LABELS: Record<UpscaleMode, string> = {
  off: 'Выключено',
  auto: 'Авто',
  fast: 'Лёгкое',
  balanced: 'Среднее',
  quality: 'Максимальное',
};

const MODE_DESCRIPTIONS: Record<UpscaleMode, string> = {
  off: 'Без обработки, без нагрузки',
  auto: 'Уровень подбирается под видеокарту',
  fast: 'Немного чётче, низкая нагрузка',
  balanced: 'Заметно чётче, средняя нагрузка',
  quality: 'Максимум чёткости, высокая нагрузка',
};

/** Признак программного адаптера: в новых версиях WebGPU он в info */
export interface AdapterFlags {
  isFallbackAdapter?: boolean;
  info?: { isFallbackAdapter?: boolean };
}

export interface UpscaleWindowStats {
  frameTimeMs: number;
  overBudgetShare: number;
}

/**
 * Проверяет сохранённое значение режима
 */
export function isUpscaleMode(value: unknown): value is UpscaleMode {
  return UPSCALE_MODES.includes(value as UpscaleMode);
}

/**
 * Проверяет сохранённое значение уровня
 */
export function isUpscalePreset(value: unknown): value is UpscalePreset {
  return UPSCALE_PRESETS.includes(value as UpscalePreset);
}

/** Аппаратный ли адаптер WebGPU: программный улучшение не тянет */
export function isHardwareAdapter(adapter: AdapterFlags | null): boolean {
  if (adapter === null) return false;
  return (
    adapter.isFallbackAdapter !== true &&
    adapter.info?.isFallbackAdapter !== true
  );
}

/** Уровень, с которого начинается обработка; null — улучшение выключено */
export function getStartPreset(
  mode: UpscaleMode,
  rememberedAutoPreset: UpscalePreset | 'off' | null,
): UpscalePreset | null {
  if (mode === 'off') return null;
  if (mode === 'auto') {
    if (rememberedAutoPreset === 'off') return null;
    return rememberedAutoPreset ?? UPSCALE_AUTO_START_PRESET;
  }

  return mode;
}

/**
 * Следующий уровень легче; null — легче некуда
 */
export function getLowerPreset(preset: UpscalePreset): UpscalePreset | null {
  const index = UPSCALE_PRESETS.indexOf(preset);

  return index > 0 ? UPSCALE_PRESETS[index - 1] : null;
}

/**
 * Итог окна замера для «Авто»: счётчик плохих окон подряд и нужно ли понизить
 */
export function evaluateAutoWindow(
  stats: UpscaleWindowStats,
  badWindows: number,
  budgetMs: number,
): { badWindows: number; stepDown: boolean } {
  if (stats.frameTimeMs > budgetMs * UPSCALE_AUTO_SEVERE_FACTOR) {
    return { badWindows: 0, stepDown: true };
  }

  const bad =
    stats.frameTimeMs > budgetMs * UPSCALE_AUTO_HEADROOM ||
    stats.overBudgetShare > UPSCALE_AUTO_OVER_BUDGET_SHARE;

  if (!bad) return { badWindows: 0, stepDown: false };

  const next = badWindows + 1;

  return next >= UPSCALE_AUTO_BAD_WINDOWS
    ? { badWindows: 0, stepDown: true }
    : { badWindows: next, stepDown: false };
}

/**
 * Название режима в меню
 */
export function getUpscaleModeLabel(mode: UpscaleMode): string {
  return MODE_LABELS[mode];
}

/**
 * Пояснение к режиму для обычного пользователя
 */
export function getUpscaleModeDescription(mode: UpscaleMode): string {
  return MODE_DESCRIPTIONS[mode];
}

/**
 * Подпись строки на главной странице меню: «Авто · Среднее»
 */
export function formatUpscaleSummary(
  mode: UpscaleMode,
  activePreset: UpscalePreset | null,
  failed: boolean,
): string {
  if (mode === 'off') return MODE_LABELS.off;
  if (failed) return 'Не удалось включить';
  if (mode === 'auto') {
    return `${MODE_LABELS.auto} · ${MODE_LABELS[activePreset ?? 'off']}`;
  }

  return MODE_LABELS[mode];
}
