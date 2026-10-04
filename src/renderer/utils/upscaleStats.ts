/**
 * Подпись замера нагрузки для плашки поверх кадра
 */
import type { UpscalePreset } from '../../constants';
import { getUpscaleModeLabel } from './upscaleMode';

export interface UpscaleStatsLike {
  preset: UpscalePreset;
  bypassed?: boolean;
  frameTimeMs: number;
  framesPerSecond?: number;
  overBudgetShare: number;
  sourceSize: { width: number; height: number };
  targetSize: { width: number; height: number };
}

/**
 * Частота обработанных кадров за окно замера; 0 без прошедшего времени
 */
export function getFramesPerSecond(frames: number, elapsedMs: number): number {
  return elapsedMs > 0 ? (frames * 1000) / elapsedMs : 0;
}

/**
 * «Среднее · 1920×1080 → 2400×1350 · 24 к/с · 2.8 мс · пропуски 0%»
 */
export function formatUpscaleStats(stats: UpscaleStatsLike): string {
  const { sourceSize, targetSize } = stats;
  const sizes = `${sourceSize.width}×${sourceSize.height} → ${targetSize.width}×${targetSize.height}`;

  if (stats.bypassed) {
    return [
      getUpscaleModeLabel(stats.preset),
      sizes,
      'обработка не нужна',
    ].join(' · ');
  }

  return [
    getUpscaleModeLabel(stats.preset),
    sizes,
    ...(stats.framesPerSecond
      ? [`${Math.round(stats.framesPerSecond)} к/с`]
      : []),
    `${stats.frameTimeMs.toFixed(1)} мс`,
    `пропуски ${Math.round(stats.overBudgetShare * 100)}%`,
  ].join(' · ');
}
