/**
 * Геометрия слоя апскейла: область кадра внутри плеера и размер холста
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelSize {
  width: number;
  height: number;
}

/**
 * Область кадра при object-fit: contain
 */
export function getContainRect(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): Rect {
  if (!containerWidth || !containerHeight || !videoWidth || !videoHeight) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale = Math.min(
    containerWidth / videoWidth,
    containerHeight / videoHeight,
  );
  const width = videoWidth * scale;
  const height = videoHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

/**
 * Размер холста в физических пикселях экрана
 */
export function getCanvasPixelSize(
  rect: Pick<Rect, 'width' | 'height'>,
  devicePixelRatio: number,
): PixelSize {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;

  return {
    width: Math.max(1, Math.round(rect.width * ratio)),
    height: Math.max(1, Math.round(rect.height * ratio)),
  };
}

/**
 * Положение черты сравнения в долях ширины кадра
 */
export function clampSplit(value: number): number {
  if (Number.isNaN(value)) return 0.5;

  return Math.min(1, Math.max(0, value));
}
