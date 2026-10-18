/**
 * Место плавающей кнопки в правом нижнем углу, не перекрывающее чужой элемент
 */
import type { RectLike } from './pointInRect';

export interface FloatingPlacementInput {
  width: number;
  height: number;
  size: number;
  margin: number;
  gap: number;
  obstacle: RectLike | null;
}

export interface FloatingPlacement {
  right: number;
  bottom: number;
}

/**
 * Пересекаются ли прямоугольники с учётом зазора
 */
function overlaps(a: RectLike, b: RectLike, gap: number): boolean {
  return (
    a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap
  );
}

/**
 * Ставит кнопку в угол; если там чужой элемент — над ним, а если сверху
 * не хватает места — слева от него
 */
export function placeFloatingButton({
  width,
  height,
  size,
  margin,
  gap,
  obstacle,
}: FloatingPlacementInput): FloatingPlacement {
  const corner = { right: margin, bottom: margin };
  const cornerRect = {
    left: width - margin - size,
    top: height - margin - size,
    right: width - margin,
    bottom: height - margin,
  };

  if (!obstacle || !overlaps(cornerRect, obstacle, gap)) {
    return corner;
  }

  if (obstacle.top - gap - size >= margin) {
    return { right: margin, bottom: height - obstacle.top + gap };
  }

  return { right: width - obstacle.left + gap, bottom: margin };
}
