/**
 * Расчёты отражения кадра для фоновой подсветки
 */

/**
 * Разрешает отражение кадра, если с прошлого прошло не меньше промежутка
 */
export function shouldDrawFrame(
  now: number,
  lastDrawAt: number,
  intervalMs: number,
): boolean {
  return now - lastDrawAt >= intervalMs;
}

/**
 * Собирает фильтр буфера: размытие в исходном разрешении и насыщенность
 */
export function buildSourceFilter(blurPx: number, saturation: number): string {
  return `blur(${blurPx}px) saturate(${saturation})`;
}

/**
 * Поле, за которое размытие успевает сойти на нет. Гауссиан гасится
 * на трёх стандартных отклонениях, а blur(N) задаёт отклонение равным N
 */
export function getFadeMargin(blurPx: number): number {
  return blurPx * 3;
}

/**
 * Размер буфера: кадр плюс поле по margin пикселей с каждой стороны
 */
export function getBufferSize(
  width: number,
  height: number,
  margin: number,
): { width: number; height: number } {
  return { width: width + margin * 2, height: height + margin * 2 };
}

/**
 * Прямоугольник кадра внутри буфера. Поле нужно, чтобы размытие затухало
 * в буфере, а не обрывалось его краем
 */
export function getSourceRect(
  width: number,
  height: number,
  margin: number,
): { x: number; y: number; width: number; height: number } {
  return { x: margin, y: margin, width, height };
}

/**
 * Геометрия слоя свечения в процентах от кадра. Поле буфера квадратное,
 * поэтому кольцо свечения выходит одинаковым по всем сторонам
 */
export function getOverscanBox(
  width: number,
  height: number,
  margin: number,
): { top: string; left: string; width: string; height: string } {
  const percent = (value: number): string => `${(value * 100).toFixed(3)}%`;

  return {
    top: percent(-margin / height),
    left: percent(-margin / width),
    width: percent((width + margin * 2) / width),
    height: percent((height + margin * 2) / height),
  };
}
