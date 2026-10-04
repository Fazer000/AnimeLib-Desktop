import { isCursorInZone } from '../shared/hoverZone';

const BOUNDS = { x: 100, y: 50, width: 1600, height: 900 };
const ZONE = { x: 710, y: 0, width: 180, height: 32 };

describe('isCursorInZone', () => {
  it('курсор над зоной в шапке окна', () => {
    expect(isCursorInZone({ x: 900, y: 60 }, BOUNDS, ZONE, 1)).toBe(true);
  });

  it('курсор рядом с зоной или ниже шапки — мимо', () => {
    expect(isCursorInZone({ x: 805, y: 60 }, BOUNDS, ZONE, 1)).toBe(false);
    expect(isCursorInZone({ x: 900, y: 82 }, BOUNDS, ZONE, 1)).toBe(false);
  });

  it('учитывает масштаб страницы', () => {
    expect(isCursorInZone({ x: 1700, y: 70 }, BOUNDS, ZONE, 2)).toBe(true);
    expect(isCursorInZone({ x: 900, y: 60 }, BOUNDS, ZONE, 2)).toBe(false);
  });
});
