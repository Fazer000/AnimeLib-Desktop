import { PlaybackTimeStore } from '../renderer/services/player/PlaybackTimeStore';
import { segmentFill } from '../renderer/components/player/ProgressBar';

describe('PlaybackTimeStore', () => {
  it('уведомляет подписчиков временем и буфером', () => {
    const store = new PlaybackTimeStore();
    const listener = jest.fn();

    store.subscribe(listener);
    store.set(12.5, 30);

    expect(listener).toHaveBeenCalledWith(12.5, 30);
    expect(store.getCurrentTime()).toBe(12.5);
    expect(store.getBuffered()).toBe(30);
  });

  it('сохраняет прошлый буфер, когда передано только время', () => {
    const store = new PlaybackTimeStore();

    store.set(1, 40);
    store.set(2);

    expect(store.getBuffered()).toBe(40);
    expect(store.getCurrentTime()).toBe(2);
  });

  it('отписка прекращает уведомления', () => {
    const store = new PlaybackTimeStore();
    const listener = jest.fn();

    const unsubscribe = store.subscribe(listener);
    store.set(1, 1);
    unsubscribe();
    store.set(2, 2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reset обнуляет время и буфер', () => {
    const store = new PlaybackTimeStore();

    store.set(100, 200);
    store.reset();

    expect(store.getCurrentTime()).toBe(0);
    expect(store.getBuffered()).toBe(0);
  });
});

describe('segmentFill', () => {
  const segment = { start: 100, end: 200, type: 'normal' as const };

  it('до сегмента — 0, после — 100', () => {
    expect(segmentFill(segment, 50)).toBe(0);
    expect(segmentFill(segment, 250)).toBe(100);
  });

  it('внутри сегмента считает долю', () => {
    expect(segmentFill(segment, 150)).toBe(50);
    expect(segmentFill(segment, 125)).toBe(25);
  });

  it('нулевая длина сегмента не даёт NaN', () => {
    expect(segmentFill({ start: 10, end: 10, type: 'normal' }, 10)).toBe(0);
    expect(segmentFill({ start: 10, end: 10, type: 'normal' }, 5)).toBe(0);
    expect(segmentFill({ start: 10, end: 10, type: 'normal' }, 15)).toBe(100);
  });
});
