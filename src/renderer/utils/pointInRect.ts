/**
 * Попадание точки в прямоугольник элемента
 */

export interface PointLike {
  x: number;
  y: number;
}

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Лежит ли точка внутри прямоугольника, включая границы
 */
export function isPointInRect(
  point: PointLike | null,
  rect: RectLike,
): boolean {
  if (!point) return false;

  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}
