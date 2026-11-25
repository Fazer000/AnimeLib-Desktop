/** Проверки фактического качества синтетических оффлайн-плееров. */
import type { OfflineAnime, OfflineEpisode } from '../constants';

const mockSnapshot = { anime: [] as OfflineAnime[] };
jest.mock('../renderer/services/offline/OfflineStore', () => ({
  offlineStore: { getSnapshot: () => mockSnapshot },
}));
jest.mock('../renderer/services/offline/ProgressStore', () => ({
  progressStore: { getAll: () => ({}) },
}));

// eslint-disable-next-line import/first
import { offlineCatalog } from '../renderer/services/offline/OfflineCatalog';

/** Создаёт минимальную запись скачанной серии. */
const episode = (patch: Partial<OfflineEpisode> = {}): OfflineEpisode =>
  ({
    episodeId: 1,
    playerId: 10,
    playerType: 'Kodik',
    quality: '720p',
    episodeNumber: '1',
    translationTypeId: 2,
    translationLabel: 'Озвучка',
    teamId: 7,
    teamName: 'AniDUB',
    subtitles: [],
    ...patch,
  }) as OfflineEpisode;

describe('OfflineCatalog: порядок серий', () => {
  it.each([true, false])(
    'оставляет повторные номера в конце (порядок сайта сохранён: %s)',
    (savedOrder) => {
      const makeEpisode = (
        episodeId: number,
        episodeNumber: string,
        season: string,
        order: number,
      ) =>
        episode({
          episodeId,
          episodeNumber,
          season,
          episodeOrder: savedOrder ? order : undefined,
        });
      const first = makeEpisode(10, '1', '1', 0);
      mockSnapshot.anime = [
        {
          animeId: 'test',
          episodes: [
            makeEpisode(21, '2', '2', 25),
            first,
            makeEpisode(20, '1', '2', 24),
            makeEpisode(19, '24', '1', 23),
            { ...first, playerId: 15 },
          ],
        } as OfflineAnime,
      ];
      expect(offlineCatalog.getEpisodes('test').map(({ id }) => id)).toEqual([
        10, 19, 20, 21,
      ]);
    },
  );
});

describe('OfflineCatalog: качество', () => {
  it('передаёт фактическое разрешение в плеер без изменения ключа загрузки', () => {
    const enhanced = episode({
      enhanced: true,
      videoHeight: 1440,
      videoWidth: 2560,
    });
    mockSnapshot.anime = [
      {
        animeId: 'test',
        episodes: [enhanced, episode({ quality: '1080p' })],
      } as OfflineAnime,
    ];
    const [player] = offlineCatalog.getPlayers('test', 1);
    expect(player.video?.quality.map((item) => item.quality)).toEqual([
      1440, 1080,
    ]);
    expect(enhanced.quality).toBe('720p');
  });
  it('сохраняет исходное качество необработанной серии', () => {
    mockSnapshot.anime = [
      { animeId: 'test', episodes: [episode()] } as OfflineAnime,
    ];
    expect(
      offlineCatalog.getPlayers('test', 1)[0].video?.quality[0].quality,
    ).toBe(720);
  });
});
