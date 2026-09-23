import {
  dominantWheelDelta,
  nextWheelScrollTarget,
} from '../renderer/utils/wheelScroll';

describe('dominantWheelDelta', () => {
  it('обычное колесо даёт вертикальный сдвиг', () => {
    expect(dominantWheelDelta(0, 100)).toBe(100);
  });

  it('Shift + колесо даёт горизонтальный сдвиг', () => {
    expect(dominantWheelDelta(-100, 0)).toBe(-100);
  });

  it('при смешанном свайпе берётся более сильная ось', () => {
    expect(dominantWheelDelta(30, -5)).toBe(30);
    expect(dominantWheelDelta(4, -20)).toBe(-20);
  });
});

describe('nextWheelScrollTarget', () => {
  it('сдвигает цель на сдвиг колеса с множителем', () => {
    expect(nextWheelScrollTarget(0, 100, 3, 2000)).toBe(300);
  });

  it('быстрое вращение складывается от прошлой цели', () => {
    const first = nextWheelScrollTarget(0, 100, 3, 2000);

    expect(nextWheelScrollTarget(first, 100, 3, 2000)).toBe(600);
  });

  it('не уходит левее начала ленты', () => {
    expect(nextWheelScrollTarget(100, -100, 3, 2000)).toBe(0);
  });

  it('не уходит правее конца ленты', () => {
    expect(nextWheelScrollTarget(1900, 100, 3, 2000)).toBe(2000);
  });

  it('если лента помещается целиком, прокрутки нет', () => {
    expect(nextWheelScrollTarget(0, 100, 3, -50)).toBe(0);
  });
});
