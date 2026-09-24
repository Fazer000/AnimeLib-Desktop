/**
 * Подпись замера нагрузки для плашки поверх кадра
 */
import type { UpscalePreset } from '../../constants';
import { getUpscaleModeLabel } from './upscaleMode';

export interface UpscaleStatsLike {
  preset: UpscalePreset;
  frameTimeMs: number;
  overBudgetShare: number;
  sourceSize: { width: number; height: number };
  targetSize: { width: number; height: number };
}

/**
 * «Среднее · 1920×1080 → 2400×1350 · 2.8 мс · пропуски 0%»
 */
export function formatUpscaleStats(stats: UpscaleStatsLike): string {
  const { sourceSize, targetSize } = stats;

  return [
    getUpscaleModeLabel(stats.preset),
    `${sourceSize.width}×${sourceSize.height} → ${targetSize.width}×${targetSize.height}`,
    `${stats.frameTimeMs.toFixed(1)} мс`,
    `пропуски ${Math.round(stats.overBudgetShare * 100)}%`,
  ].join(' · ');
}
