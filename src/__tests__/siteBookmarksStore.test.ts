import {
  SiteBookmarksStore,
  siteBookmarksKey,
  siteBookmarksSignature,
} from '../renderer/services/bookmarks/SiteBookmarksStore';
import { getSiteFolderStatuses } from '../renderer/utils/folderBookmarks';

const item = (slug: string, number?: string) => ({
  media: { slug_url: slug },
  item: number ? { volume: '1', number } : null,
});

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const flush = () => wait(0);

describe('siteBookmarksKey и siteBookmarksSignature', () => {
  it('ключ различает пользователя, сайт и папку', () => {
    expect(siteBookmarksKey('7', 1, 2)).toBe('7:1:2');
    expect(siteBookmarksKey('7', 1, 2)).not.toBe(siteBookmarksKey('8', 1, 2));
  });

  it('сигнатура меняется вместе с главой', () => {
    expect(siteBookmarksSignature([item('a', '3')])).not.toBe(
      siteBookmarksSignature([item('a', '4')]),
    );
    expect(siteBookmarksSignature([item('a')])).toBe('a:');
  });
});

describe('SiteBookmarksStore', () => {
  it('до загрузки — пустой незагруженный список, после — сохранённый', async () => {
    const loader = jest.fn().mockResolvedValue([item('a')]);
    const store = new SiteBookmarksStore(loader, 0);

    expect(store.get('k')).toEqual({ items: [], loaded: false });
    await store.load('k', 1, 2);
    expect(store.get('k')).toEqual({ items: [item('a')], loaded: true });
    expect(loader).toHaveBeenCalledWith(1, 2);
  });

  it('подписчик сразу получает сохранённое и узнаёт только о реальных изменениях', async () => {
    const loader = jest
      .fn()
      .mockResolvedValueOnce([item('a', '1')])
      .mockResolvedValueOnce([item('a', '1')])
      .mockResolvedValueOnce([item('a', '2')]);
    const store = new SiteBookmarksStore(loader, 0);
    const listener = jest.fn();

    store.subscribe('k', 1, 2, listener);
    expect(listener).toHaveBeenLastCalledWith({ items: [], loaded: false });

    await store.load('k', 1, 2);
    await store.load('k', 1, 2);
    await store.load('k', 1, 2);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith({
      items: [item('a', '2')],
      loaded: true,
    });
  });

  it('сбой не стирает уже загруженный список', async () => {
    const loader = jest
      .fn()
      .mockResolvedValueOnce([item('a')])
      .mockRejectedValueOnce(new Error('offline'));
    const store = new SiteBookmarksStore(loader, 0);

    await store.load('k', 1, 2);
    await store.load('k', 1, 2);
    expect(store.get('k').items).toEqual([item('a')]);
  });

  it('после изменения закладок перезагружает только открытые списки', async () => {
    const loader = jest.fn().mockResolvedValue([]);
    const store = new SiteBookmarksStore(loader, 0);
    const unsubscribe = store.subscribe('open', 1, 2, () => {});
    await store.load('closed', 1, 5);
    loader.mockClear();

    store.invalidate();
    await wait(5);
    await flush();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith(1, 2);
    unsubscribe();
  });

  it('вызов во время загрузки ставит ещё один круг, а не второй запрос', async () => {
    let release: (value: unknown[]) => void = () => {};
    const loader = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<unknown[]>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValueOnce([item('b')]);
    const store = new SiteBookmarksStore(loader, 0);

    const first = store.load('k', 1, 2);
    store.load('k', 1, 2);
    expect(loader).toHaveBeenCalledTimes(1);

    release([item('a')]);
    await first;
    await flush();
    expect(loader).toHaveBeenCalledTimes(2);
    expect(store.get('k').items).toEqual([item('b')]);
  });
});

describe('getSiteFolderStatuses', () => {
  it('у аниме — «Запланировано» и «Любимое», у читалок ещё «Читаю»', () => {
    expect(getSiteFolderStatuses('anime')).toEqual([22, 25]);
    expect(getSiteFolderStatuses('manga')).toEqual([1, 2, 5]);
  });
});
