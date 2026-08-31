import { progressStore } from '../renderer/services/offline/ProgressStore';
import { viewedStore } from '../renderer/services/offline/ViewedStore';
import {
  OFFLINE_PROGRESS_STORAGE_KEY,
  OFFLINE_VIEWED_STORAGE_KEY,
} from '../constants';

describe('ProgressStore', () => {
  beforeEach(() => localStorage.clear());

  const entry = (patch: Record<string, unknown> = {}) => ({
    animeId: 'one-piece',
    episodeId: 1,
    playerId: 10,
    timecode: '00:05:00',
    seconds: 300,
    itemNumber: '1',
    teamId: 7,
    translationTypeId: 1,
    playerType: 'Animelib',
    synced: false,
    ...patch,
  });

  it('сохраняет и читает позицию по тайтлу и серии', () => {
    progressStore.save(entry());

    expect(progressStore.get('one-piece', 1)).toMatchObject({
      seconds: 300,
      synced: false,
    });
  });

  it('на неизвестную серию отдаёт null', () => {
    expect(progressStore.get('one-piece', 99)).toBeNull();
  });

  it('повторное сохранение перезаписывает запись, а не плодит', () => {
    progressStore.save(entry({ seconds: 100 }));
    progressStore.save(entry({ seconds: 500 }));

    expect(Object.keys(progressStore.getAll())).toHaveLength(1);
    expect(progressStore.get('one-piece', 1)?.seconds).toBe(500);
  });

  it('серии разных тайтлов не смешиваются', () => {
    progressStore.save(entry());
    progressStore.save(entry({ animeId: 'naruto' }));

    expect(progressStore.get('naruto', 1)?.animeId).toBe('naruto');
    expect(Object.keys(progressStore.getAll())).toHaveLength(2);
  });

  it('приводит отметку времени с сайта к ISO', () => {
    progressStore.saveAt(entry(), '2026-01-02 03:04:05');

    expect(progressStore.get('one-piece', 1)?.updatedAt).toBe(
      new Date('2026-01-02T03:04:05').toISOString(),
    );
  });

  it('неразбираемую отметку заменяет текущим временем', () => {
    progressStore.saveAt(entry(), 'не дата');

    const saved = progressStore.get('one-piece', 1)?.updatedAt ?? '';
    expect(Number.isNaN(new Date(saved).getTime())).toBe(false);
  });

  it('последняя серия тайтла выбирается по времени, а не по номеру', () => {
    progressStore.saveAt(entry({ episodeId: 5 }), '2026-01-01T00:00:00Z');
    progressStore.saveAt(entry({ episodeId: 2 }), '2026-03-01T00:00:00Z');

    expect(progressStore.getLatestForAnime('one-piece')?.episodeId).toBe(2);
  });

  it('для тайтла без записей последней серии нет', () => {
    expect(progressStore.getLatestForAnime('unknown')).toBeNull();
  });

  it('в очередь синхронизации попадают только неотправленные', () => {
    progressStore.save(entry({ episodeId: 1 }));
    progressStore.save(entry({ episodeId: 2, synced: true }));

    expect(progressStore.getPending().map((item) => item.episodeId)).toEqual([
      1,
    ]);
  });

  it('пометка синхронизации убирает запись из очереди', () => {
    progressStore.save(entry());

    progressStore.markSynced('one-piece', 1);

    expect(progressStore.getPending()).toHaveLength(0);
    expect(progressStore.get('one-piece', 1)?.synced).toBe(true);
  });

  it('пометка несуществующей записи ничего не создаёт', () => {
    progressStore.markSynced('one-piece', 42);

    expect(progressStore.getAll()).toEqual({});
  });

  it('битое хранилище читается как пустое', () => {
    localStorage.setItem(OFFLINE_PROGRESS_STORAGE_KEY, 'не json');

    expect(progressStore.getAll()).toEqual({});
    expect(progressStore.get('one-piece', 1)).toBeNull();
  });
});

describe('ViewedStore', () => {
  beforeEach(() => localStorage.clear());

  const mark = (patch: Record<string, unknown> = {}) => ({
    animeId: 'one-piece',
    episodeId: 1,
    playerId: 10,
    synced: false,
    ...patch,
  });

  it('ставит отметку и находит её по тайтлу и плееру', () => {
    viewedStore.mark(mark());

    expect(viewedStore.isMarked('one-piece', 10)).toBe(true);
    expect(viewedStore.isMarked('one-piece', 11)).toBe(false);
  });

  it('отметки разных озвучек независимы', () => {
    viewedStore.mark(mark({ playerId: 10 }));
    viewedStore.mark(mark({ playerId: 20 }));

    expect(viewedStore.getPending()).toHaveLength(2);
  });

  it('уже отправленную отметку повторно не перезаписывает', () => {
    viewedStore.mark(mark());
    viewedStore.markSynced('one-piece', 10);

    viewedStore.mark(mark({ episodeId: 999 }));

    expect(viewedStore.getPending()).toHaveLength(0);
    expect(Object.values(viewedStore.getAll())[0].episodeId).toBe(1);
  });

  it('в очередь попадают только неотправленные', () => {
    viewedStore.mark(mark({ playerId: 10 }));
    viewedStore.mark(mark({ playerId: 20 }));
    viewedStore.markSynced('one-piece', 20);

    expect(viewedStore.getPending().map((item) => item.playerId)).toEqual([10]);
  });

  it('пометка несуществующей отметки ничего не создаёт', () => {
    viewedStore.markSynced('one-piece', 10);

    expect(viewedStore.getAll()).toEqual({});
  });

  it('битое хранилище читается как пустое', () => {
    localStorage.setItem(OFFLINE_VIEWED_STORAGE_KEY, '{сломано');

    expect(viewedStore.getAll()).toEqual({});
    expect(viewedStore.isMarked('one-piece', 10)).toBe(false);
  });
});
