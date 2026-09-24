import { isPointInRect } from '../renderer/utils/pointInRect';

const RECT = { left: 10, top: 20, right: 110, bottom: 70 };

describe('isPointInRect', () => {
  it('точка внутри и на границе попадает', () => {
    expect(isPointInRect({ x: 50, y: 40 }, RECT)).toBe(true);
    expect(isPointInRect({ x: 10, y: 70 }, RECT)).toBe(true);
  });

  it('точка снаружи не попадает', () => {
    expect(isPointInRect({ x: 5, y: 40 }, RECT)).toBe(false);
    expect(isPointInRect({ x: 50, y: 71 }, RECT)).toBe(false);
  });

  it('без известной точки — не попадает', () => {
    expect(isPointInRect(null, RECT)).toBe(false);
  });
});
