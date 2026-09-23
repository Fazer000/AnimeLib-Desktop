/**
 * Расчёт горизонтальной прокрутки ленты колесом мыши
 */

/**
 * Берёт ось с большим сдвигом: колесо даёт вертикальный, а Shift + колесо
 * и свайп тачпадом — горизонтальный
 */
export function dominantWheelDelta(deltaX: number, deltaY: number): number {
  return Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
}

/**
 * Следующая целевая позиция ленты: копится от прошлой цели, поэтому
 * быстрое вращение колеса складывается, а не теряется
 */
export function nextWheelScrollTarget(
  target: number,
  delta: number,
  multiplier: number,
  maxScroll: number,
): number {
  return Math.max(
    0,
    Math.min(Math.max(0, maxScroll), target + delta * multiplier),
  );
}
