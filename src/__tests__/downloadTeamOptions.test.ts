import type { Player } from '../renderer/api/animeApi';
import {
  getDownloadTeamOptions,
  getEpisodeQualities,
  resolveTeamPlayer,
} from '../renderer/components/offline/EpisodeSelectionList';

const variant = (id: number, type: number, label: string, quality: number) =>
  ({
    id,
    player: 'Animelib',
    team: { id: 17, name: 'AniLibria.TV' },
    translation_type: { id: type, label },
    video: { quality: [{ quality }] },
  }) as Player;

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
