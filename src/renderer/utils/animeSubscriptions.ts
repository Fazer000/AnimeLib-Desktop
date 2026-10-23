/**
 * Подписки на выход серий: команды по типу перевода и выбор «Любая»
 */
import {
  SUBSCRIPTION_ANY_TEAM,
  TEAM_BRANCH_BOTH,
  TEAM_BRANCH_SUBTITLES,
  TEAM_BRANCH_VOICE,
  TRANSLATION_TYPE_SUBTITLES,
  TRANSLATION_TYPE_VOICE,
} from '../../constants';

export interface SubscriptionTeamLike {
  id: number;
  details?: { branch_id?: number | null } | null;
}

export interface AnimeSubscriptionItem {
  team_id: number;
  translation_type: number;
}

/** Делит команды на озвучку и субтитры */
export function splitTeamsByBranch<T extends SubscriptionTeamLike>(
  teams: T[] | null | undefined,
): { voices: T[]; subtitles: T[] } {
  const list = teams ?? [];
  const byBranch = (branch: number) =>
    list.filter((team) => (team.details?.branch_id ?? null) === branch);
  const both = byBranch(TEAM_BRANCH_BOTH);

  return {
    voices: [...byBranch(TEAM_BRANCH_VOICE), ...both],
    subtitles: [...byBranch(TEAM_BRANCH_SUBTITLES), ...both],
  };
}

/**
 * Команды, на которые оформлена подписка данного типа перевода
 */
export function getSubscribedTeams(
  items: AnimeSubscriptionItem[] | null | undefined,
  translationType: number,
): number[] {
  return (items ?? [])
    .filter((item) => item.translation_type === translationType)
    .map((item) => item.team_id);
}

/** Переключает команду в выборе */
export function toggleSubscriptionTeam(
  selected: number[],
  teamId: number,
): number[] {
  if (selected.includes(teamId)) {
    return selected.filter((id) => id !== teamId);
  }

  if (teamId === SUBSCRIPTION_ANY_TEAM) {
    return [SUBSCRIPTION_ANY_TEAM];
  }

  return [...selected.filter((id) => id !== SUBSCRIPTION_ANY_TEAM), teamId];
}

/**
 * Собирает тело запроса подписки из выбора озвучки и субтитров
 */
export function buildSubscriptionItems(
  voiceTeams: number[],
  subtitleTeams: number[],
): AnimeSubscriptionItem[] {
  return [
    ...voiceTeams.map((teamId) => ({
      team_id: teamId,
      translation_type: TRANSLATION_TYPE_VOICE,
    })),
    ...subtitleTeams.map((teamId) => ({
      team_id: teamId,
      translation_type: TRANSLATION_TYPE_SUBTITLES,
    })),
  ];
}
