import {
  getCanvasPixelSize,
  getContainRect,
} from '../renderer/utils/upscaleGeometry';
import FrameTimeMeter from '../renderer/utils/FrameTimeMeter';

describe('getContainRect', () => {
  it('4:3 в 16:9 — поля по бокам', () => {
    expect(getContainRect(1600, 900, 1440, 1080)).toEqual({
      x: 200,
      y: 0,
      width: 1200,
      height: 900,
    });
  });

  it('21:9 в 16:9 — поля сверху и снизу', () => {
    const rect = getContainRect(1600, 900, 2560, 1080);

    expect(rect.x).toBe(0);
    expect(rect.width).toBe(1600);
    expect(rect.height).toBeCloseTo(675);
    expect(rect.y).toBeCloseTo(112.5);
  });

  it('без размеров — пустая область', () => {
    expect(getContainRect(1600, 900, 0, 0)).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

describe('getCanvasPixelSize', () => {
  it('учитывает масштаб экрана и округляет', () => {
    expect(getCanvasPixelSize({ width: 1200.4, height: 900 }, 1.5)).toEqual({
      width: 1801,
      height: 1350,
    });
  });

  it('не бывает меньше пикселя и не ломается на нулевом масштабе', () => {
    expect(getCanvasPixelSize({ width: 0, height: 0 }, 0)).toEqual({
      width: 1,
      height: 1,
    });
  });
});

describe('FrameTimeMeter', () => {
  it('считает скользящее среднее по окну', () => {
    const meter = new FrameTimeMeter(3);

    [2, 4, 6, 8].forEach((ms) => meter.push(ms));

    expect(meter.average()).toBe(6);
  });

  it('доля кадров сверх бюджета', () => {
    const meter = new FrameTimeMeter(4);

    [5, 12, 20, 8].forEach((ms) => meter.push(ms));

    expect(meter.overBudgetShare(10)).toBe(0.5);
  });

  it('без замеров — нули, сброс очищает окно', () => {
    const meter = new FrameTimeMeter(4);

    expect(meter.average()).toBe(0);
    meter.push(10);
    meter.reset();
    expect(meter.overBudgetShare(5)).toBe(0);
  });
});
