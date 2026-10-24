const markPlayerViewed = jest.fn();

jest.mock('../renderer/api/animeApi', () => ({
  animeApi: {
    markPlayerViewed: (...args: unknown[]) => markPlayerViewed(...args),
  },
}));

jest.mock('../renderer/services/offline', () => ({
  viewedStore: { mark: jest.fn() },
}));

// eslint-disable-next-line import/first
import { WatchStatsManager } from '../renderer/services/player/WatchStatsManager';
// eslint-disable-next-line import/first
import { WATCH_VIEW_RETRY_MS } from '../constants';

const DURATION = 1400;

const playUntilViewed = (manager: WatchStatsManager, from: number) => {
  for (let t = from; t <= from + 70; t += 0.25) {
    manager.updateProgress(t, DURATION, true);
  }
};

const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

describe('WatchStatsManager: повтор отметки', () => {
  let now = 0;

  beforeEach(() => {
    markPlayerViewed.mockReset();
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  it('после сбоя не повторяет до истечения паузы', async () => {
    markPlayerViewed.mockRejectedValue(new Error('aborted'));
    const manager = new WatchStatsManager();
    manager.setContext(1, 2, null, 3);

    playUntilViewed(manager, 900);
    await flush();
    expect(markPlayerViewed).toHaveBeenCalledTimes(1);

    manager.updateProgress(971, DURATION, true);
    await flush();
    expect(markPlayerViewed).toHaveBeenCalledTimes(1);

    now += WATCH_VIEW_RETRY_MS;
    manager.updateProgress(971.25, DURATION, true);
    await flush();
    expect(markPlayerViewed).toHaveBeenCalledTimes(2);
  });

  it('после успеха больше не отправляет', async () => {
    markPlayerViewed.mockResolvedValue(true);
    const manager = new WatchStatsManager();
    manager.setContext(1, 2, null, 3);

    playUntilViewed(manager, 900);
    await flush();
    now += WATCH_VIEW_RETRY_MS;
    manager.updateProgress(971, DURATION, true);
    await flush();
    expect(markPlayerViewed).toHaveBeenCalledTimes(1);
  });
});
