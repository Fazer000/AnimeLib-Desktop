import type { Player } from '../renderer/api/animeApi';
import {
  findCurrentPlayer,
  findOfflineCopies,
  getPlayerIdentity,
  pickPlayerIdentity,
} from '../renderer/utils/playerIdentity';

const player = (
  id: number,
  type = 'Kodik',
  teamId = 7,
  translationTypeId = 2,
): Player =>
  ({
    id,
    player: type,
    team: { id: teamId },
    translation_type: { id: translationTypeId },
  }) as Player;

const copy = (
  playerId: number,
  playerType = 'Kodik',
  teamId = 7,
  translationTypeId = 2,
  quality = '720p',
) => ({ playerId, playerType, teamId, translationTypeId, quality });

describe('getPlayerIdentity', () => {
  it('берёт тип плеера, команду и вид перевода', () => {
    expect(getPlayerIdentity(player(1, 'Animelib', 3, 1))).toEqual({
      playerType: 'Animelib',
      teamId: 3,
      translationTypeId: 1,
    });
  });
});

describe('pickPlayerIdentity', () => {
  it('отдаёт признаки, когда известны все три', () => {
    expect(
      pickPlayerIdentity({
        playerType: 'Kodik',
        teamId: 0,
        translationTypeId: 2,
      }),
    ).toEqual({ playerType: 'Kodik', teamId: 0, translationTypeId: 2 });
  });

  it('у старой записи без признаков отдаёт null', () => {
    expect(pickPlayerIdentity({})).toBeNull();
    expect(pickPlayerIdentity({ playerType: 'Kodik', teamId: 7 })).toBeNull();
  });
});

describe('findCurrentPlayer', () => {
  const identity = { playerType: 'Kodik', teamId: 7, translationTypeId: 2 };

  it('плеер с прежним id находится по id', () => {
    const players = [player(10, 'Animelib'), player(11)];

    expect(findCurrentPlayer(players, 10, identity)?.id).toBe(10);
  });

  it('пересозданный плеер находится по признакам', () => {
    const players = [player(20, 'Animelib'), player(21)];

    expect(findCurrentPlayer(players, 11, identity)?.id).toBe(21);
  });

  it('без признаков ищет только по id', () => {
    expect(findCurrentPlayer([player(21)], 11, null)).toBeNull();
  });

  it('другая команда, вид перевода или тип плеера не подходят', () => {
    const players = [
      player(21, 'Kodik', 8, 2),
      player(22, 'Kodik', 7, 1),
      player(23, 'Animelib', 7, 2),
    ];

    expect(findCurrentPlayer(players, 11, identity)).toBeNull();
  });
});

describe('findOfflineCopies', () => {
  it('отдаёт все качества, скачанные под id плеера', () => {
    const copies = [
      copy(11, 'Kodik', 7, 2, '720p'),
      copy(11, 'Kodik', 7, 2, '480p'),
    ];

    expect(findOfflineCopies(copies, player(11))).toHaveLength(2);
  });

  it('копии под прежним id находит по признакам', () => {
    const copies = [copy(11), copy(30, 'Animelib')];

    expect(findOfflineCopies(copies, player(21))).toEqual([copy(11)]);
  });

  it('совпадение по id важнее совпадения по признакам', () => {
    const copies = [
      copy(11, 'Kodik', 7, 2, '720p'),
      copy(21, 'Kodik', 7, 2, '480p'),
    ];

    expect(findOfflineCopies(copies, player(21))).toEqual([
      copy(21, 'Kodik', 7, 2, '480p'),
    ]);
  });

  it('копии другой озвучки не подходят', () => {
    expect(findOfflineCopies([copy(11, 'Kodik', 8)], player(21))).toEqual([]);
  });
});
