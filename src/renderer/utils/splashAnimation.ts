/** Расчёт кадров эмблемы для заставок сайта и плеера. */
import SPLASH_TIMING from '../../constants/splash';

/** Ограничивает долю интервалом от нуля до единицы. */
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Вычисляет положение и прозрачность элементов эмблемы. */
export function splashFrame(
  elapsed: number,
  exitElapsed: number | null,
  reduced: boolean,
) {
  const blendT = clamp((elapsed - 280) / 260);
  const exit =
    exitElapsed === null
      ? 0
      : 1 - (1 - clamp(exitElapsed / SPLASH_TIMING.exit)) ** 3;
  const blend =
    exitElapsed === null
      ? blendT * blendT * (3 - 2 * blendT)
      : clamp((elapsed - exitElapsed - 280) / 260) * (1 - exit);
  const entry = 1 - (1 - clamp(elapsed / SPLASH_TIMING.entry)) ** 5;
  const cycle = (Math.max(0, elapsed - 280) % 1400) / 1400;
  const breath = Math.sin(cycle * 2 * Math.PI) * blend;
  const glint = (1 - Math.cos(clamp((cycle - 0.46) / 0.42) * Math.PI)) / 2;
  return {
    exit,
    cycle,
    blend,
    offset: reduced ? 0 : (1 - entry) * 18.5 + 1.35 * breath + 6.8 * exit,
    opacity: reduced ? 1 : clamp(elapsed / 160),
    scale: reduced ? 1 : 0.9 + 0.1 * entry + 0.015 * breath + 0.042 * exit,
    sheenX: -15 + 134 * glint,
    sheenOpacity: !reduced && cycle >= 0.46 && cycle <= 0.88 ? blend : 0,
  };
}

/** Вычисляет границы и яркость импульса вдоль скобки. */
export function splashPulse(
  length: number,
  cycle: number,
  blend: number,
  reduced: boolean,
) {
  if (length <= 0 || reduced || cycle > 0.72)
    return { head: 0, tail: 0, alpha: 0 };
  const t = clamp(cycle / 0.72);
  const u = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  const travel = u * length * 1.44;
  const pulseLength = length * 0.44;
  return {
    head: Math.min(length, travel),
    tail: Math.max(0, travel - pulseLength),
    alpha:
      clamp(Math.min(travel, length * 1.44 - travel) / pulseLength) * blend,
  };
}
