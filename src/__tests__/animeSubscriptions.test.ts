import {
  buildSubscriptionItems,
  getSubscribedTeams,
  splitTeamsByBranch,
  toggleSubscriptionTeam,
} from '../renderer/utils/animeSubscriptions';

describe('splitTeamsByBranch', () => {
  it('команды обоих типов идут в оба списка после собственных', () => {
    const teams = [
      { id: 1, details: { branch_id: 1 } },
      { id: 2, details: { branch_id: 2 } },
      { id: 3, details: { branch_id: 0 } },
      { id: 4, details: { branch_id: 2 } },
    ];

    const { voices, subtitles } = splitTeamsByBranch(teams);

    expect(voices.map((team) => team.id)).toEqual([2, 4, 3]);
    expect(subtitles.map((team) => team.id)).toEqual([1, 3]);
  });

  it('команды без ветки и пустой список не ломают разбор', () => {
    expect(splitTeamsByBranch([{ id: 9 }])).toEqual({
      voices: [],
      subtitles: [],
    });
    expect(splitTeamsByBranch(null)).toEqual({ voices: [], subtitles: [] });
  });
});

describe('getSubscribedTeams', () => {
  it('отбирает команды нужного типа перевода', () => {
    const items = [
      { team_id: 32412, translation_type: 2 },
      { team_id: 0, translation_type: 1 },
      { team_id: 500, translation_type: 2 },
    ];

    expect(getSubscribedTeams(items, 2)).toEqual([32412, 500]);
    expect(getSubscribedTeams(items, 1)).toEqual([0]);
    expect(getSubscribedTeams(null, 1)).toEqual([]);
  });
});

describe('toggleSubscriptionTeam', () => {
  it('добавляет и снимает команду', () => {
    expect(toggleSubscriptionTeam([5], 7)).toEqual([5, 7]);
    expect(toggleSubscriptionTeam([5, 7], 5)).toEqual([7]);
  });

  it('«Любая» заменяет конкретные команды', () => {
    expect(toggleSubscriptionTeam([5, 7], 0)).toEqual([0]);
  });

  it('конкретная команда снимает «Любую»', () => {
    expect(toggleSubscriptionTeam([0], 5)).toEqual([5]);
  });
});

describe('buildSubscriptionItems', () => {
  it('озвучка идёт с типом 2, субтитры с типом 1', () => {
    expect(buildSubscriptionItems([32412], [0])).toEqual([
      { team_id: 32412, translation_type: 2 },
      { team_id: 0, translation_type: 1 },
    ]);
  });

  it('пустой выбор снимает все подписки', () => {
    expect(buildSubscriptionItems([], [])).toEqual([]);
  });
});
