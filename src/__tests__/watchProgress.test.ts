import PlaybackTracker from '../renderer/utils/playbackTracker';
import shouldMarkViewed from '../renderer/utils/watchProgress';

const play = (tracker: PlaybackTracker, from: number, to: number) => {
  for (let t = from; t <= to; t += 0.25) tracker.update(t, true);
};

describe('PlaybackTracker', () => {
  it('копит проигранное время', () => {
    const tracker = new PlaybackTracker(3);
    play(tracker, 0, 90);
    expect(tracker.playedSinceSeek).toBeCloseTo(90);
  });

  it('перемотка вперёд и назад обнуляет счёт', () => {
    const tracker = new PlaybackTracker(3);
    play(tracker, 0, 30);
    tracker.update(800, true);
    expect(tracker.playedSinceSeek).toBe(0);

    play(tracker, 800, 810);
    tracker.update(100, true);
    expect(tracker.playedSinceSeek).toBe(0);
  });

  it('на паузе время не копится, а перемотка на паузе обнуляет счёт', () => {
    const tracker = new PlaybackTracker(3);
    play(tracker, 0, 20);
    tracker.update(21, false);
    expect(tracker.playedSinceSeek).toBeCloseTo(20);

    tracker.update(900, false);
    expect(tracker.playedSinceSeek).toBe(0);
  });

  it('первое обновление только запоминает позицию', () => {
    const tracker = new PlaybackTracker(3);
    tracker.update(600, true);
    expect(tracker.playedSinceSeek).toBe(0);
  });

  it('reset начинает учёт заново', () => {
    const tracker = new PlaybackTracker(3);
    play(tracker, 0, 10);
    tracker.reset();
    tracker.update(500, true);
    expect(tracker.playedSinceSeek).toBe(0);
  });
});

describe('shouldMarkViewed', () => {
  it('нужны 60% позиции и воспроизведение после перемотки', () => {
    expect(shouldMarkViewed(900, 1400, 0.25)).toBe(true);
    expect(shouldMarkViewed(900, 1400, 0)).toBe(false);
    expect(shouldMarkViewed(500, 1400, 500)).toBe(false);
  });

  it('без длительности не засчитывает', () => {
    expect(shouldMarkViewed(10, 0, 100)).toBe(false);
  });
});
