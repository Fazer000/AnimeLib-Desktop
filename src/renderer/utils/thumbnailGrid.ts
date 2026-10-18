/**
 * Сетка кадров превью на полоске и порядок их фоновой подготовки
 */

/**
 * Шаг сетки для длительности: базовый, но не больше maxFrames кадров
 * на всю серию; всегда кратен базовому
 */
export function resolveGridStep(
  duration: number,
  baseStep: number,
  maxFrames: number,
): number {
  if (duration <= 0) return baseStep;

  const minStep = duration / maxFrames;

  return Math.max(baseStep, Math.ceil(minStep / baseStep) * baseStep);
}

/**
 * Время ячейки сетки, в которую попадает момент
 */
export function snapToGrid(time: number, step: number): number {
  return Math.max(0, Math.floor(time / step) * step);
}

/**
 * Все ячейки сетки в порядке деления пополам: начало, середина, четверти,
 * восьмые и так до шага сетки. Плотность готовых кадров растёт по всей
 * длительности сразу, а не от начала к концу
 */
export function buildPrecacheOrder(duration: number, step: number): number[] {
  const cells = Math.ceil(duration / step);
  if (cells <= 0) return [];

  let stride = 1;
  while (stride * 2 < cells) stride *= 2;

  const seen = new Set<number>();
  const order: number[] = [];

  for (; stride >= 1; stride /= 2) {
    for (let cell = 0; cell < cells; cell += stride) {
      if (!seen.has(cell)) {
        seen.add(cell);
        order.push(cell * step);
      }
    }
  }

  return order;
}

/**
 * Ближайшее к моменту время среди готовых кадров; null — кадров нет
 */
export function findNearestTime(
  times: Iterable<number>,
  time: number,
): number | null {
  let nearest: number | null = null;
  let nearestDiff = Infinity;

  // eslint-disable-next-line no-restricted-syntax
  for (const candidate of times) {
    const diff = Math.abs(candidate - time);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = candidate;
    }
  }

  return nearest;
}

export interface SeekVideoState {
  currentTime: number;
  seeking: boolean;
  readyState: number;
}

/**
 * Можно ли снимать кадр: перемотка закончена, картинка загружена
 * (HAVE_CURRENT_DATA) и видео стоит на нужном времени
 */
export function isFrameReady(state: SeekVideoState, time: number): boolean {
  return (
    !state.seeking &&
    state.readyState >= 2 &&
    Math.abs(state.currentTime - time) < 0.5
  );
}
