import { AMBIENT_SOURCE_BLUR, AMBIENT_SOURCE_MARGIN } from '../constants';
import {
  buildSourceFilter,
  getBufferSize,
  getFadeMargin,
  getOverscanBox,
  getSourceRect,
  shouldDrawFrame,
} from '../renderer/utils/ambientFrame';

describe('shouldDrawFrame', () => {
  it('пропускает кадр, если промежуток не истёк', () => {
    expect(shouldDrawFrame(1040, 1000, 50)).toBe(false);
  });

  it('разрешает кадр ровно на границе промежутка', () => {
    expect(shouldDrawFrame(1050, 1000, 50)).toBe(true);
  });

  it('разрешает первый кадр, когда отражений ещё не было', () => {
    expect(shouldDrawFrame(12.5, 0, 50)).toBe(false);
    expect(shouldDrawFrame(120, 0, 50)).toBe(true);
  });

  it('нулевой промежуток разрешает каждый кадр', () => {
    expect(shouldDrawFrame(1000, 1000, 0)).toBe(true);
  });
});

describe('buildSourceFilter', () => {
  it('собирает размытие и насыщенность одной строкой', () => {
    expect(buildSourceFilter(3, 1.6)).toBe('blur(3px) saturate(1.6)');
  });

  it('нулевое размытие остаётся валидным фильтром', () => {
    expect(buildSourceFilter(0, 1)).toBe('blur(0px) saturate(1)');
  });
});

describe('getBufferSize', () => {
  it('поле добавляется с каждой стороны кадра', () => {
    expect(getBufferSize(64, 36, 6)).toEqual({ width: 76, height: 48 });
  });

  it('без поля буфер совпадает с кадром', () => {
    expect(getBufferSize(64, 36, 0)).toEqual({ width: 64, height: 36 });
  });
});

describe('getOverscanBox', () => {
  it('слой раздвигается на поле буфера по каждой оси', () => {
    expect(getOverscanBox(64, 36, 6)).toEqual({
      top: '-16.667%',
      left: '-9.375%',
      width: '118.750%',
      height: '133.333%',
    });
  });

  it('кольцо свечения одинаково по всем сторонам', () => {
    const videoWidth = 1600;
    const videoHeight = videoWidth / (64 / 36);
    const box = getOverscanBox(64, 36, 6);
    const ringX = (parseFloat(box.left) / -100) * videoWidth;
    const ringY = (parseFloat(box.top) / -100) * videoHeight;

    expect(ringX).toBeCloseTo(ringY, 2);
  });

  it('без поля слой совпадает с кадром', () => {
    expect(getOverscanBox(64, 36, 0)).toEqual({
      top: '0.000%',
      left: '0.000%',
      width: '100.000%',
      height: '100.000%',
    });
  });
});

describe('getSourceRect', () => {
  it('кадр смещается внутрь буфера на поле', () => {
    expect(getSourceRect(64, 36, 6)).toEqual({
      x: 6,
      y: 6,
      width: 64,
      height: 36,
    });
  });

  it('кадр остаётся в центре буфера', () => {
    const buffer = getBufferSize(64, 36, 6);
    const rect = getSourceRect(64, 36, 6);

    expect(rect.x * 2 + rect.width).toBe(buffer.width);
    expect(rect.y * 2 + rect.height).toBe(buffer.height);
  });

  it('без поля кадр занимает весь буфер', () => {
    expect(getSourceRect(64, 36, 0)).toEqual({
      x: 0,
      y: 0,
      width: 64,
      height: 36,
    });
  });
});

describe('getFadeMargin', () => {
  it('поле берётся втрое больше размытия', () => {
    expect(getFadeMargin(2)).toBe(6);
  });

  it('поле буфера вмещает затухание выбранного размытия', () => {
    expect(AMBIENT_SOURCE_MARGIN).toBeGreaterThanOrEqual(
      getFadeMargin(AMBIENT_SOURCE_BLUR),
    );
  });
});
