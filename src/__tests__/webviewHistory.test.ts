import { NavigationHistoryTracker } from '../renderer/services/webview/NavigationHistoryTracker';
import { PlayerHistoryManager } from '../renderer/services/webview/PlayerHistoryManager';

describe('NavigationHistoryTracker', () => {
  beforeEach(() => {
    localStorage.clear();
    NavigationHistoryTracker.clear();
    NavigationHistoryTracker.setEnabled(false);
  });

  it('нумерует переходы подряд', () => {
    NavigationHistoryTracker.record({ source: 'navigate', url: 'a' });
    NavigationHistoryTracker.record({ source: 'back', url: 'b' });

    expect(
      NavigationHistoryTracker.getRecords().map((item) => item.index),
    ).toEqual([1, 2]);
  });

  it('сохраняет источник, адрес и доступность навигации', () => {
    NavigationHistoryTracker.record({
      source: 'in-page',
      url: 'https://animelib.org/x',
      canGoBack: true,
      canGoForward: true,
    });

    expect(NavigationHistoryTracker.getRecords()[0]).toMatchObject({
      source: 'in-page',
      url: 'https://animelib.org/x',
      canGoBack: true,
      canGoForward: true,
    });
  });

  it('без указания флагов считает навигацию недоступной', () => {
    NavigationHistoryTracker.record({ source: 'navigate', url: 'a' });

    expect(NavigationHistoryTracker.getRecords()[0]).toMatchObject({
      canGoBack: false,
      canGoForward: false,
    });
  });

  it('журнал не растёт бесконечно, старые записи вытесняются', () => {
    for (let i = 0; i < 250; i += 1) {
      NavigationHistoryTracker.record({ source: 'navigate', url: `u${i}` });
    }

    const records = NavigationHistoryTracker.getRecords();
    expect(records).toHaveLength(200);
    expect(records[records.length - 1].url).toBe('u249');
    expect(records[0].url).toBe('u50');
  });

  it('журнал отдаётся копией', () => {
    NavigationHistoryTracker.record({ source: 'navigate', url: 'a' });

    NavigationHistoryTracker.getRecords().pop();

    expect(NavigationHistoryTracker.getRecords()).toHaveLength(1);
  });

  it('clear обнуляет и записи, и нумерацию', () => {
    NavigationHistoryTracker.record({ source: 'navigate', url: 'a' });
    NavigationHistoryTracker.clear();
    NavigationHistoryTracker.record({ source: 'navigate', url: 'b' });

    expect(NavigationHistoryTracker.getRecords()[0].index).toBe(1);
  });

  it('признак отладки сохраняется в хранилище', () => {
    NavigationHistoryTracker.setEnabled(true);

    expect(localStorage.getItem('animeLibNavDebug')).toBe('true');
    expect(NavigationHistoryTracker.isEnabled()).toBe(true);
  });

  it('install публикует отладочный API в window', () => {
    NavigationHistoryTracker.install();

    expect(typeof window.animeLibNav?.records).toBe('function');
    expect(window.animeLibNav?.records()).toEqual([]);
  });
});

describe('PlayerHistoryManager', () => {
  const PLAYER = 'anime-lib-player://one-piece/1';
  const CATALOG = 'https://animelib.org/ru/catalog';
  const TITLE = 'https://animelib.org/ru/anime/one-piece';

  it('незавершённый переход в историю не попадает', () => {
    const manager = new PlayerHistoryManager();

    manager.open(PLAYER, 'one-piece', CATALOG);

    expect(manager.getDepth()).toBe(0);
    expect(manager.takeEntryFor(TITLE)).toBeNull();
  });

  it('после перехода на страницу запись сохраняется', () => {
    const manager = new PlayerHistoryManager();

    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(TITLE);

    expect(manager.getDepth()).toBe(1);
  });

  it('«Назад» с той же страницы возвращает в плеер', () => {
    const manager = new PlayerHistoryManager();
    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(TITLE);

    const entry = manager.takeEntryFor(TITLE);

    expect(entry?.playerUrl).toBe(PLAYER);
    expect(manager.getDepth()).toBe(0);
  });

  it('различия в query и хвостовом слеше не мешают совпадению', () => {
    const manager = new PlayerHistoryManager();
    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(`${TITLE}/`);

    expect(manager.takeEntryFor(`${TITLE}?tab=info`)).not.toBeNull();
  });

  it('с чужой страницы запись не забирается', () => {
    const manager = new PlayerHistoryManager();
    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(TITLE);

    expect(manager.takeEntryFor(CATALOG)).toBeNull();
    expect(manager.getDepth()).toBe(1);
  });

  it('discard отменяет незавершённый переход', () => {
    const manager = new PlayerHistoryManager();

    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.discard();
    manager.commit(TITLE);

    expect(manager.getDepth()).toBe(0);
  });

  it('вложенные переходы разворачиваются в обратном порядке', () => {
    const manager = new PlayerHistoryManager();
    const second = 'anime-lib-player://one-piece/2';

    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(TITLE);
    manager.open(second, 'one-piece', TITLE);
    manager.commit(CATALOG);

    expect(manager.takeEntryFor(CATALOG)?.playerUrl).toBe(second);
    expect(manager.takeEntryFor(TITLE)?.playerUrl).toBe(PLAYER);
    expect(manager.getDepth()).toBe(0);
  });

  it('возврат в плеер снова делает переход незавершённым', () => {
    const manager = new PlayerHistoryManager();
    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(TITLE);
    manager.takeEntryFor(TITLE);

    manager.commit(CATALOG);

    expect(manager.getDepth()).toBe(1);
  });

  it('clear стирает всю историю', () => {
    const manager = new PlayerHistoryManager();
    manager.open(PLAYER, 'one-piece', CATALOG);
    manager.commit(TITLE);

    manager.clear();

    expect(manager.getDepth()).toBe(0);
    expect(manager.takeEntryFor(TITLE)).toBeNull();
  });
});
