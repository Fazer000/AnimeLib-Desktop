import fs from 'fs';
import os from 'os';
import path from 'path';

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'animelib-library-'));

jest.mock('electron', () => ({
  app: { getPath: () => userData },
}));

// eslint-disable-next-line import/first
import { offlineLibrary } from '../main/offline/OfflineLibrary';
// eslint-disable-next-line import/first
import { OFFLINE_INDEX_FILE, OfflineEpisode } from '../constants';

const meta = {
  title: 'One Piece',
  coverUrl: 'https://cover',
  rating: '8.5',
  year: 1999,
  totalEpisodes: 1100,
};

const episode = (patch: Record<string, unknown> = {}): OfflineEpisode => ({
  episodeId: 1,
  episodeNumber: '1',
  episodeName: 'Серия 1',
  season: '1',
  playerId: 10,
  playerType: 'Animelib',
  teamId: 7,
  teamName: 'Team',
  translationTypeId: 1,
  translationLabel: 'Озвучка',
  quality: '720p',
  fileName: 'a.mp4',
  playlistFileName: '',
  fileSize: 100,
  timecode: [],
  subtitles: [],
  createdAt: '2026-01-01T00:00:00Z',
  ...(patch as object),
});

/** Кладёт файл в каталог загрузок, чтобы проверить удаление с диска. */
const touch = (fileName: string) => {
  fs.writeFileSync(offlineLibrary.resolveFile(fileName), 'x');
};

const reset = () => {
  fs.rmSync(path.join(userData, 'offline'), { recursive: true, force: true });
  offlineLibrary.init();
};

describe('OfflineLibrary: каталог', () => {
  beforeEach(reset);

  it('первая серия создаёт запись тайтла', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode());

    const [entry] = offlineLibrary.getAnime();
    expect(entry.animeId).toBe('one-piece');
    expect(entry.title).toBe('One Piece');
    expect(entry.episodes).toHaveLength(1);
  });

  it('вторая серия дописывается в тот же тайтл', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode({ episodeId: 1 }));
    offlineLibrary.addEpisode('one-piece', meta, episode({ episodeId: 2 }));

    expect(offlineLibrary.getAnime()).toHaveLength(1);
    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(2);
  });

  it('серии сортируются по номеру, а не по порядку добавления', () => {
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({ episodeId: 3, episodeNumber: '10' }),
    );
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({ episodeId: 1, episodeNumber: '2' }),
    );

    expect(
      offlineLibrary.getAnime()[0].episodes.map((item) => item.episodeNumber),
    ).toEqual(['2', '10']);
  });

  it('повторная загрузка того же качества заменяет запись', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode({ fileSize: 100 }));
    offlineLibrary.addEpisode('one-piece', meta, episode({ fileSize: 500 }));

    const { episodes } = offlineLibrary.getAnime()[0];
    expect(episodes).toHaveLength(1);
    expect(episodes[0].fileSize).toBe(500);
  });

  it('разные качества и озвучки живут рядом', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode({ quality: '720p' }));
    offlineLibrary.addEpisode('one-piece', meta, episode({ quality: '1080p' }));
    offlineLibrary.addEpisode('one-piece', meta, episode({ playerId: 20 }));

    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(3);
  });

  it('hasEpisode различает качество и озвучку', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode());

    expect(offlineLibrary.hasEpisode(1, 10, '720p')).toBe(true);
    expect(offlineLibrary.hasEpisode(1, 10, '1080p')).toBe(false);
    expect(offlineLibrary.hasEpisode(1, 99, '720p')).toBe(false);
  });

  it('каталог переживает перезапуск', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode());

    offlineLibrary.init();

    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(1);
  });

  it('битый индекс читается как пустой каталог', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode());
    fs.writeFileSync(
      path.join(offlineLibrary.getDownloadsPath(), OFFLINE_INDEX_FILE),
      'не json',
    );

    offlineLibrary.init();

    expect(offlineLibrary.getAnime()).toEqual([]);
  });
});

describe('OfflineLibrary: удаление', () => {
  beforeEach(reset);

  it('удаление серии стирает её файлы с диска', () => {
    touch('a.mp4');
    offlineLibrary.addEpisode('one-piece', meta, episode());

    const removed = offlineLibrary.removeEpisode('one-piece', 1, 10, '720p');

    expect(removed).toContain('a.mp4');
    expect(fs.existsSync(offlineLibrary.resolveFile('a.mp4'))).toBe(false);
  });

  it('вместе с серией удаляются плейлист и субтитры', () => {
    ['a.ts', 'a.m3u8', 'a.ass'].forEach(touch);
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({
        fileName: 'a.ts',
        playlistFileName: 'a.m3u8',
        subtitles: [{ fileName: 'a.ass', name: 'ru', format: 'ass' }],
      }),
    );

    const removed = offlineLibrary.removeEpisode('one-piece', 1, 10, '720p');

    expect(removed.sort()).toEqual(['a.ass', 'a.m3u8', 'a.ts']);
  });

  it('удаление последней серии убирает тайтл из каталога', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode());

    offlineLibrary.removeEpisode('one-piece', 1, 10, '720p');

    expect(offlineLibrary.getAnime()).toEqual([]);
  });

  it('удаление одной серии не трогает остальные', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode({ episodeId: 1 }));
    offlineLibrary.addEpisode('one-piece', meta, episode({ episodeId: 2 }));

    offlineLibrary.removeEpisode('one-piece', 1, 10, '720p');

    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(1);
  });

  it('удаление несуществующей серии ничего не ломает', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode());

    expect(offlineLibrary.removeEpisode('one-piece', 99, 10, '720p')).toEqual(
      [],
    );
    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(1);
  });

  it('удаление тайтла уносит все серии и обложку', () => {
    ['a.mp4', 'b.mp4', 'cover.jpg'].forEach(touch);
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({ episodeId: 1, fileName: 'a.mp4' }),
      'cover.jpg',
    );
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({ episodeId: 2, fileName: 'b.mp4' }),
    );

    const removed = offlineLibrary.removeAnime('one-piece');

    expect(removed.sort()).toEqual(['a.mp4', 'b.mp4', 'cover.jpg']);
    expect(offlineLibrary.getAnime()).toEqual([]);
  });

  it('удаление неизвестного тайтла возвращает пустой список', () => {
    expect(offlineLibrary.removeAnime('unknown')).toEqual([]);
  });
});

describe('OfflineLibrary: сверка с диском', () => {
  beforeEach(reset);

  it('hasFile видит только непустые существующие файлы', () => {
    touch('a.mp4');
    fs.writeFileSync(offlineLibrary.resolveFile('empty.mp4'), '');

    expect(offlineLibrary.hasFile('a.mp4')).toBe(true);
    expect(offlineLibrary.hasFile('empty.mp4')).toBe(false);
    expect(offlineLibrary.hasFile('missing.mp4')).toBe(false);
    expect(offlineLibrary.hasFile('')).toBe(false);
  });

  it('verify выбрасывает записи без файлов на диске', () => {
    touch('a.mp4');
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({ episodeId: 1, fileName: 'a.mp4' }),
    );
    offlineLibrary.addEpisode(
      'one-piece',
      meta,
      episode({ episodeId: 2, fileName: 'gone.mp4' }),
    );

    const removed = offlineLibrary.verify();

    expect(removed).toBe(1);
    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(1);
  });

  it('verify на целом каталоге ничего не трогает', () => {
    touch('a.mp4');
    offlineLibrary.addEpisode('one-piece', meta, episode());

    expect(offlineLibrary.verify()).toBe(0);
    expect(offlineLibrary.getAnime()[0].episodes).toHaveLength(1);
  });

  it('getCoverFileName отдаёт обложку тайтла', () => {
    offlineLibrary.addEpisode('one-piece', meta, episode(), 'cover.jpg');

    expect(offlineLibrary.getCoverFileName('one-piece')).toBe('cover.jpg');
    expect(offlineLibrary.getCoverFileName('unknown')).toBe('');
  });
});
