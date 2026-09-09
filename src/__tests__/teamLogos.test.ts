import {
  collectTeamLogoFileNames,
  findTeamLogoFileName,
} from '../main/offline/teamLogos';
import type { OfflineAnime, OfflineEpisode } from '../constants';

const episode = (patch: Partial<OfflineEpisode>): OfflineEpisode =>
  ({
    episodeId: 1,
    teamId: 0,
    teamLogoFileName: '',
    ...patch,
  }) as OfflineEpisode;

const anime = (episodes: OfflineEpisode[]): OfflineAnime =>
  ({ animeId: 'a', episodes }) as OfflineAnime;

describe('teamLogos: поиск логотипа озвучки', () => {
  it('находит логотип по озвучке в другом аниме', () => {
    const catalog = [
      anime([episode({ teamId: 7 })]),
      anime([episode({ teamId: 9, teamLogoFileName: 'nine.img' })]),
    ];

    expect(findTeamLogoFileName(catalog, 9)).toBe('nine.img');
  });

  it('пропускает серии той же озвучки без логотипа', () => {
    const catalog = [
      anime([
        episode({ teamId: 9 }),
        episode({ teamId: 9, teamLogoFileName: 'nine.img' }),
      ]),
    ];

    expect(findTeamLogoFileName(catalog, 9)).toBe('nine.img');
  });

  it('без совпадения по озвучке отдаёт пустую строку', () => {
    const catalog = [
      anime([episode({ teamId: 7, teamLogoFileName: 'a.img' })]),
    ];

    expect(findTeamLogoFileName(catalog, 9)).toBe('');
  });

  it('нулевая озвучка не подбирает чужой логотип', () => {
    const catalog = [
      anime([episode({ teamId: 0, teamLogoFileName: 'a.img' })]),
    ];

    expect(findTeamLogoFileName(catalog, 0)).toBe('');
  });

  it('пустой каталог не ломает поиск', () => {
    expect(findTeamLogoFileName([], 9)).toBe('');
  });
});

describe('teamLogos: сбор имён файлов', () => {
  it('собирает имена без повторов и без пустых', () => {
    const catalog = [
      anime([
        episode({ teamId: 9, teamLogoFileName: 'nine.img' }),
        episode({ teamId: 9, teamLogoFileName: 'nine.img' }),
        episode({ teamId: 7 }),
      ]),
      anime([episode({ teamId: 5, teamLogoFileName: 'five.img' })]),
    ];

    expect(collectTeamLogoFileNames(catalog).sort()).toEqual([
      'five.img',
      'nine.img',
    ]);
  });

  it('пустой каталог даёт пустой список', () => {
    expect(collectTeamLogoFileNames([])).toEqual([]);
  });
});
