/**
 * Подпись замера апскейла для плашки поверх кадра
 */

export interface UpscaleStatsLike {
  frameTimeMs: number;
  overBudgetShare: number;
  sourceSize: { width: number; height: number };
  targetSize: { width: number; height: number };
}

/**
 * «Anime4K A · 1920×1080 → 2400×1350 · ≈2.8 мс · сверх 60 Гц 0%»
 */
export function formatUpscaleStats(stats: UpscaleStatsLike): string {
  const { sourceSize, targetSize } = stats;

  return [
    'Anime4K A',
    `${sourceSize.width}×${sourceSize.height} → ${targetSize.width}×${targetSize.height}`,
    `≈${stats.frameTimeMs.toFixed(1)} мс`,
    `сверх 60 Гц ${Math.round(stats.overBudgetShare * 100)}%`,
  ].join(' · ');
}
