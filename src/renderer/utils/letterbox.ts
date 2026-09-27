/**
 * Поля вокруг кадра при object-fit: contain
 */
import type { Rect } from './upscaleGeometry';

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
 * overlapPx заводит поля под край кадра, чтобы на стыке не было щели
 */
export function getLetterboxClipPath(
  frame: Rect,
  containerWidth: number,
  containerHeight: number,
  overlapPx: number = 0,
): string {
  const rect = {
    x: frame.x + overlapPx,
    y: frame.y + overlapPx,
    width: Math.max(0, frame.width - overlapPx * 2),
    height: Math.max(0, frame.height - overlapPx * 2),
  };
  const x = (value: number) =>
    `${((value / containerWidth) * 100).toFixed(3)}%`;
  const y = (value: number) =>
    `${((value / containerHeight) * 100).toFixed(3)}%`;
  const left = x(rect.x);
  const right = x(rect.x + rect.width);
  const top = y(rect.y);
  const bottom = y(rect.y + rect.height);

  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left} ${top}, ${right} ${top}, ${right} ${bottom}, ${left} ${bottom}, ${left} ${top})`;
}
