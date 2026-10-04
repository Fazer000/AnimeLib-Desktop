/**
 * Зона наведения в области перетаскивания окна: там у страницы нет событий
 * мыши, поэтому попадание курсора проверяет главный процесс
 */

export interface HoverZoneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Лежит ли курсор (экранные координаты) в зоне, заданной в CSS-пикселях
 * страницы. contentBounds — область содержимого окна на экране
 */
export function isCursorInZone(
  cursor: ScreenPoint,
  contentBounds: HoverZoneRect,
  zone: HoverZoneRect,
  zoomFactor: number,
): boolean {
  const zoom = zoomFactor > 0 ? zoomFactor : 1;
  const x = (cursor.x - contentBounds.x) / zoom;
  const y = (cursor.y - contentBounds.y) / zoom;

  return (
    x >= zone.x &&
    x < zone.x + zone.width &&
    y >= zone.y &&
    y < zone.y + zone.height
  );
}
