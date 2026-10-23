/**
 * Расчёт громкости по прокрутке колеса мыши
 */

/** Копит прокрутку и отдаёт шаг громкости, когда накопится порог */
export function accumulateWheel(
  pending: number,
  deltaY: number,
  threshold: number,
): { steps: number; pending: number } {
  const total = pending + deltaY;
  const raw = Math.trunc(total / threshold);
  const steps = Math.max(-1, Math.min(1, raw));

  return { steps, pending: steps === 0 ? total : 0 };
}

/**
 * Новая громкость после шагов колеса: вверх громче, вниз тише
 */
export function nextWheelVolume(
  current: number,
  steps: number,
  step: number,
): number {
  const volume = Math.max(0, Math.min(1, current - steps * step));

  return Math.round(volume * 100) / 100;
}
