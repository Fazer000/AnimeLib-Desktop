import {
  buildPrecacheOrder,
  findNearestTime,
  isFrameReady,
  resolveGridStep,
  snapToGrid,
} from '../renderer/utils/thumbnailGrid';

describe('resolveGridStep', () => {
  it('для обычной серии берёт базовый шаг', () => {
    expect(resolveGridStep(1440, 5, 800)).toBe(5);
  });

  it('для длинного видео укрупняет шаг, оставляя его кратным базовому', () => {
    expect(resolveGridStep(7200, 5, 800)).toBe(10);
    expect(resolveGridStep(5000, 5, 800)).toBe(10);
  });

  it('без длительности отдаёт базовый шаг', () => {
    expect(resolveGridStep(0, 5, 800)).toBe(5);
  });
});

describe('snapToGrid', () => {
  it('прижимает момент к началу ячейки', () => {
    expect(snapToGrid(0, 5)).toBe(0);
    expect(snapToGrid(4.9, 5)).toBe(0);
    expect(snapToGrid(5, 5)).toBe(5);
    expect(snapToGrid(73.4, 5)).toBe(70);
  });

  it('отрицательное время не уходит за начало', () => {
    expect(snapToGrid(-3, 5)).toBe(0);
  });
});

describe('buildPrecacheOrder', () => {
  it('начинает с концов и середины, потом дробит промежутки', () => {
    expect(buildPrecacheOrder(80, 5).slice(0, 5)).toEqual([0, 40, 20, 60, 10]);
  });

  it('покрывает всю сетку без повторов, даже если ячеек не степень двойки', () => {
    const order = buildPrecacheOrder(130, 5);

    expect(order).toHaveLength(26);
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 26 }, (_, i) => i * 5),
    );
  });

  it('первые кадры разбросаны по всей длительности, а не у начала', () => {
    const first = buildPrecacheOrder(1440, 5).slice(0, 8);

    expect(Math.max(...first)).toBeGreaterThan(1000);
  });

  it('пустая длительность — пустой порядок', () => {
    expect(buildPrecacheOrder(0, 5)).toEqual([]);
  });
});

describe('findNearestTime', () => {
  it('находит ближайший готовый кадр на любом расстоянии', () => {
    expect(findNearestTime([0, 120, 600], 400)).toBe(600);
    expect(findNearestTime([0, 120, 600], 100)).toBe(120);
  });

  it('при равном расстоянии берёт встреченный первым', () => {
    expect(findNearestTime([60, 120], 90)).toBe(60);
  });

  it('без кадров отдаёт null', () => {
    expect(findNearestTime([], 10)).toBeNull();
    expect(findNearestTime(new Map<number, string>().keys(), 10)).toBeNull();
  });
});

describe('isFrameReady', () => {
  const ready = { currentTime: 30, seeking: false, readyState: 4 };

  it('готово, когда перемотка закончена на нужном времени', () => {
    expect(isFrameReady(ready, 30)).toBe(true);
  });

  it('пока идёт перемотка, кадр снимать нельзя, даже если время уже совпало', () => {
    expect(isFrameReady({ ...ready, seeking: true }, 30)).toBe(false);
  });

  it('без загруженной картинки кадр снимать нельзя', () => {
    expect(isFrameReady({ ...ready, currentTime: 0, readyState: 1 }, 0)).toBe(
      false,
    );
  });

  it('видео на другом времени — не готово', () => {
    expect(isFrameReady(ready, 35)).toBe(false);
  });
});
