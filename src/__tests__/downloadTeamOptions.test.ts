import type { Player } from '../renderer/api/animeApi';
import {
  getDownloadTeamOptions,
  getEpisodeQualities,
  prepareEpisodeDownload,
  resolveTeamPlayer,
} from '../renderer/utils/downloadSelection';

const variant = (id: number, type: number, label: string, quality: number) =>
  ({
    id,
    player: 'Animelib',
    team: { id: 17, name: 'AniLibria.TV' },
    translation_type: { id: type, label },
    video: { quality: [{ quality }] },
  }) as Player;

it.each([
  [
    '//cdn.example.com/episode.mp4:hls:manifest.m3u8',
    'https://cdn.example.com/episode.mp4',
    'progressive',
  ],
  [
    '//cdn.example.com/episode.m3u8',
    'https://cdn.example.com/episode.m3u8',
    'hls',
  ],
])(
  'выбирает формат источника Kodik по ссылке %s',
  (src, videoUrl, sourceType) => {
    const player = { ...variant(101, 1, 'Озвучка', 720), player: 'Kodik' };
    const [{ key }] = getDownloadTeamOptions([player]);
    expect(
      prepareEpisodeDownload({
        players: [player],
        teamKey: key,
        preferredQuality: '720p',
        overrideQuality: undefined,
        kodikQualities: { 101: ['720p'] },
        kodikLinks: { 101: { '720': [{ src }] } },
        credentials: { authToken: '', siteOrigin: 'https://animelib.org' },
      }).source,
    ).toMatchObject({ videoUrl, sourceType });
  },
);

it('различает одноимённые варианты и находит выбранный вариант в другой серии', () => {
  const dub = variant(100, 1, 'Озвучка', 1080);
  const sub = variant(101, 2, 'Субтитры', 2160);
  const nextSub = variant(102, 2, 'Субтитры', 720);
  const nextDub = variant(103, 1, 'Озвучка', 1080);
  const options = getDownloadTeamOptions([dub, sub, nextSub, nextDub]);
  expect(options.map(({ label }) => label)).toEqual([
    'AniLibria.TV',
    'AniLibria.TV · Субтитры',
  ]);
  const { key } = options[1];
  expect(resolveTeamPlayer([nextDub, nextSub], key)?.id).toBe(102);
  expect(getEpisodeQualities([nextDub, nextSub], key)).toEqual(['720p']);
  expect(resolveTeamPlayer([nextDub], key)).toBeUndefined();
});

it('готовит URL именно для выбранной дорожки и качества', () => {
  const dub = variant(100, 1, 'Озвучка', 1080);
  const sub = {
    ...variant(101, 2, 'Субтитры', 2160),
    video_domain: 'secondary_2',
    video: {
      id: 101,
      quality: [
        { quality: 2160, href: '/sub-2160.mp4', bitrate: 0 },
        { quality: 720, href: '/sub-720.mp4', bitrate: 0 },
      ],
    },
  };
  const players = [dub, sub];
  const [, { key }] = getDownloadTeamOptions(players);
  const options = {
    players,
    teamKey: key,
    preferredQuality: '2160p',
    kodikQualities: {},
    kodikLinks: {},
    credentials: { authToken: '', siteOrigin: 'https://animelib.org' },
  };
  expect(
    prepareEpisodeDownload({ ...options, overrideQuality: '720p' }),
  ).toMatchObject({
    player: { id: 101 },
    quality: '720p',
    source: {
      videoUrl: 'https://video1.imglib.info/sub-720.mp4',
      sourceType: 'progressive',
    },
  });
  expect(
    prepareEpisodeDownload({ ...options, overrideQuality: '1080p' }),
  ).toMatchObject({
    quality: '2160p',
    source: { videoUrl: 'https://video1.imglib.info/sub-2160.mp4' },
  });
});

it('объединяет источники и использует Kodik только при отсутствии Animelib', () => {
  const animelib = variant(100, 1, 'Озвучка', 1080);
  const kodik = {
    ...variant(101, 1, 'Озвучка', 720),
    player: 'Kodik',
    team: { ...animelib.team, id: 28 },
  };
  const sub = variant(102, 2, 'Субтитры', 2160);
  const options = getDownloadTeamOptions([kodik, sub, animelib]);
  expect(options.map(({ label }) => label)).toEqual([
    'AniLibria.TV',
    'AniLibria.TV · Субтитры',
  ]);
  const { key } = options[0];
  expect(resolveTeamPlayer([kodik, sub, animelib], key)).toBe(animelib);
  expect(resolveTeamPlayer([sub, kodik], key)).toBe(kodik);
  expect(
    getEpisodeQualities([kodik, animelib], key, { 101: ['720p'] }),
  ).toEqual(['1080p']);
});
