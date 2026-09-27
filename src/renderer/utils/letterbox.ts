/**
 * Поля вокруг кадра при object-fit: contain
 */
import type { Rect } from './upscaleGeometry';

const OUTER_BLEED_PX = 1;

/**
 * Есть ли у кадра поля шире порога хотя бы с одной стороны
 */
export function hasLetterbox(
  rect: Rect,
  containerWidth: number,
  containerHeight: number,
  minPx: number,
): boolean {
  if (!rect.width || !rect.height) return false;

  return (
    containerWidth - rect.width >= minPx * 2 ||
    containerHeight - rect.height >= minPx * 2
  );
}

/**
 * clip-path, оставляющий только поля: весь контейнер минус область кадра.
 * Два отдельных контура без соединяющего отрезка: у многоугольника с дыркой
 * этот отрезок при сглаживании рисуется тонкой линией через поле.
 * overlapPx заводит поля под край кадра, чтобы на стыке не было щели;
 * внешний контур вынесен за край контейнера, чтобы по краю плеера
 * не было тёмной кромки от сглаживания
 */
export function getLetterboxClipPath(
  frame: Rect,
  containerWidth: number,
  containerHeight: number,
  overlapPx: number = 0,
): string {
  const round = (value: number) => Number(value.toFixed(2));
  const left = round(frame.x + overlapPx);
  const top = round(frame.y + overlapPx);
  const right = round(frame.x + frame.width - overlapPx);
  const bottom = round(frame.y + frame.height - overlapPx);
  const near = -OUTER_BLEED_PX;
  const farX = round(containerWidth + OUTER_BLEED_PX);
  const farY = round(containerHeight + OUTER_BLEED_PX);

  return `path(evenodd, 'M ${near} ${near} H ${farX} V ${farY} H ${near} Z M ${left} ${top} H ${right} V ${bottom} H ${left} Z')`;
}
