/** Диапазоны загруженного, как у HTMLMediaElement.buffered. */
export interface BufferedRanges {
  length: number;
  start: (index: number) => number;
  end: (index: number) => number;
}

/** Допуск на стыке диапазонов и на позиции воспроизведения, с. */
const GAP_TOLERANCE = 0.25;

/**
 * Сколько секунд загружено вперёд от позиции воспроизведения
 */
export function bufferedAhead(ranges: BufferedRanges, time: number): number {
  for (let index = 0; index < ranges.length; index += 1) {
    const start = ranges.start(index);
    const end = ranges.end(index);
    if (time >= start - GAP_TOLERANCE && time <= end) {
      return Math.max(0, end - time);
    }
  }
  return 0;
}
