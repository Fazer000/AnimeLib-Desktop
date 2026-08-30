const getWatchingBookmarks = jest.fn();

jest.mock('../renderer/api/animeApi', () => ({
  animeApi: { getWatchingBookmarks: () => getWatchingBookmarks() },
}));

// eslint-disable-next-line import/first
import { BookmarkManager } from '../renderer/services/player/BookmarkManager';
// eslint-disable-next-line import/first
import { BookmarksStore } from '../renderer/services/bookmarks/BookmarksStore';

describe('BookmarkManager: таймкоды', () => {
  it('MM:SS переводится в секунды', () => {
    expect(BookmarkManager.timecodeToSeconds('05:30')).toBe(330);
    expect(BookmarkManager.timecodeToSeconds('00:00')).toBe(0);
  });

  it('HH:MM:SS переводится в секунды', () => {
    expect(BookmarkManager.timecodeToSeconds('01:05:30')).toBe(3930);
  });

  it('нераспознанный формат даёт ноль', () => {
    expect(BookmarkManager.timecodeToSeconds('')).toBe(0);
    expect(BookmarkManager.timecodeToSeconds('12')).toBe(0);
    expect(BookmarkManager.timecodeToSeconds('1:2:3:4')).toBe(0);
  });

  it('секунды переводятся в таймкод с ведущими нулями', () => {
    expect(BookmarkManager.secondsToTimecode(0)).toBe('00:00');
    expect(BookmarkManager.secondsToTimecode(65)).toBe('01:05');
    expect(BookmarkManager.secondsToTimecode(3930)).toBe('01:05:30');
  });

  it('дробные секунды отбрасываются', () => {
    expect(BookmarkManager.secondsToTimecode(65.9)).toBe('01:05');
  });

  it('преобразование туда и обратно сохраняет значение', () => {
    [0, 59, 60, 3599, 3600, 7325].forEach((seconds) => {
      const timecode = BookmarkManager.secondsToTimecode(seconds);
      expect(BookmarkManager.timecodeToSeconds(timecode)).toBe(seconds);
    });
  });
});

describe('BookmarkManager: состояние', () => {
  it('новый менеджер пуст', () => {
    const manager = new BookmarkManager();

    expect(manager.getCurrentBookmark()).toBeNull();
    expect(manager.getBookmarkedEpisodeId()).toBeNull();
    expect(manager.hasPendingTimecode()).toBe(false);
    expect(manager.isProcessed()).toBe(false);
  });

  it('таймкод забирается один раз', () => {
    const manager = new BookmarkManager();

    expect(manager.consumePendingTimecode()).toBeNull();
    expect(manager.hasPendingTimecode()).toBe(false);
  });

  it('reset возвращает менеджер в исходное состояние', () => {
    const manager = new BookmarkManager();

    manager.reset();

    expect(manager.getCurrentBookmark()).toBeNull();
    expect(manager.isProcessed()).toBe(false);
  });
});

describe('BookmarksStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getWatchingBookmarks.mockReset();
    getWatchingBookmarks.mockResolvedValue([]);
  });
  afterEach(() => jest.useRealTimers());

  const item = (slug: string, episodeNumber = '1') => ({
    animeSlugUrl: slug,
    title: slug,
    episodeNumber,
    coverUrl: null,
  });

  it('подписка сразу получает текущий список', () => {
    const store = new BookmarksStore();
    const listener = jest.fn();

    store.subscribe(listener);

    expect(listener).toHaveBeenCalledWith([]);
  });

  it('отписка прекращает уведомления', async () => {
    const store = new BookmarksStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    listener.mockClear();

    unsubscribe();
    getWatchingBookmarks.mockResolvedValue([item('one-piece')]);
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('частые вызовы обновления склеиваются в один запрос', async () => {
    const store = new BookmarksStore();

    store.refresh();
    store.refresh();
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    expect(getWatchingBookmarks).toHaveBeenCalledTimes(1);
  });

  it('обновление доходит до подписчика и до getItems', async () => {
    const store = new BookmarksStore();
    const listener = jest.fn();
    store.subscribe(listener);
    listener.mockClear();

    getWatchingBookmarks.mockResolvedValue([item('one-piece')]);
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith([item('one-piece')]);
    expect(store.getItems()).toHaveLength(1);
  });

  it('одинаковый список подписчиков не тревожит', async () => {
    const store = new BookmarksStore();
    getWatchingBookmarks.mockResolvedValue([item('one-piece')]);

    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    const listener = jest.fn();
    store.subscribe(listener);
    listener.mockClear();

    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('смена номера серии считается изменением', async () => {
    const store = new BookmarksStore();
    getWatchingBookmarks.mockResolvedValue([item('one-piece', '1')]);
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    const listener = jest.fn();
    store.subscribe(listener);
    listener.mockClear();

    getWatchingBookmarks.mockResolvedValue([item('one-piece', '2')]);
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith([item('one-piece', '2')]);
  });

  it('ошибка запроса не роняет хранилище и не чистит список', async () => {
    const store = new BookmarksStore();
    getWatchingBookmarks.mockResolvedValue([item('one-piece')]);
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    getWatchingBookmarks.mockRejectedValue(new Error('нет сети'));
    store.refresh();
    jest.runAllTimers();
    await Promise.resolve();

    expect(store.getItems()).toHaveLength(1);
  });
});
