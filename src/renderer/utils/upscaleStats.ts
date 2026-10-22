/**
 * Подпись замера нагрузки для плашки поверх кадра
 */
import {
  UPSCALE_FRAME_BUDGET_MS,
  UPSCALE_FRAME_INTERVAL_MAX_MS,
  UPSCALE_STATS_INTERVAL,
  UPSCALE_STATS_MAX_MS,
  UPSCALE_WARMUP_MAX_MS,
} from '../../constants';
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
 * Бюджет кадра по среднему интервалу между кадрами видео: обработка
 * успевает, если готова до следующего кадра. Не меньше 60 Гц
 */
export function getFrameBudgetMs(averageIntervalMs: number): number {
  return Math.max(UPSCALE_FRAME_BUDGET_MS, averageIntervalMs);
}

/**
 * Годится ли промежуток между кадрами видео для бюджета: паузы
 * и перемотки не годятся
 */
export function isFrameInterval(ms: number): boolean {
  return ms > 0 && ms <= UPSCALE_FRAME_INTERVAL_MAX_MS;
}

/**
 * Закончился ли прогрев: нужное число кадров или истекло время
 */
export function isWarmupDone(framesLeft: number, elapsedMs: number): boolean {
  return framesLeft <= 0 || elapsedMs >= UPSCALE_WARMUP_MAX_MS;
}

/**
 * Пора ли сообщить статистику: окно набрало кадры или истекло время
 */
export function isStatsWindowDue(frames: number, elapsedMs: number): boolean {
  return (
    frames > UPSCALE_STATS_INTERVAL ||
    (frames > 0 && elapsedMs >= UPSCALE_STATS_MAX_MS)
  );
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
