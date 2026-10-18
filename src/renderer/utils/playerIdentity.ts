/**
 * Сопоставление плеера после пересоздания: сайт выдаёт плееру Kodik новый id
 * при обновлении озвучки, а тип плеера, команда и вид перевода не меняются
 */
import type { Player } from '../api/animeApi';

export interface PlayerIdentity {
  playerType: string;
  teamId: number;
  translationTypeId: number;
}

/**
 * Достаёт из плеера признаки, переживающие смену id
 */
export function getPlayerIdentity(player: Player): PlayerIdentity {
  return {
    playerType: player.player,
    teamId: player.team.id,
    translationTypeId: player.translation_type.id,
  };
}

/**
 * Собирает признаки из записи, где они могут отсутствовать; null — неполные
 */
export function pickPlayerIdentity(
  source: Partial<PlayerIdentity>,
): PlayerIdentity | null {
  const { playerType, teamId, translationTypeId } = source;

  if (!playerType || teamId === undefined || translationTypeId === undefined) {
    return null;
  }

  return { playerType, teamId, translationTypeId };
}

/**
 * Проверяет совпадение типа плеера, команды и вида перевода
 */
function isSameIdentity(a: PlayerIdentity, b: PlayerIdentity): boolean {
  return (
    a.playerType === b.playerType &&
    a.teamId === b.teamId &&
    a.translationTypeId === b.translationTypeId
  );
}

/**
 * Находит актуальный плеер серии: по id, а если его уже нет — по признакам
 */
export function findCurrentPlayer(
  players: Player[],
  playerId: number,
  identity: PlayerIdentity | null,
): Player | null {
  const exact = players.find((player) => player.id === playerId);

  if (exact || !identity) {
    return exact ?? null;
  }

  return (
    players.find((player) =>
      isSameIdentity(getPlayerIdentity(player), identity),
    ) ?? null
  );
}

/**
 * Отбирает скачанные копии серии для плеера: по id, а если копии сохранены
 * под прежним id — по признакам
 */
export function findOfflineCopies<
  T extends PlayerIdentity & { playerId: number },
>(copies: T[], player: Player): T[] {
  const exact = copies.filter((copy) => copy.playerId === player.id);

  if (exact.length > 0) {
    return exact;
  }

  const identity = getPlayerIdentity(player);

  return copies.filter((copy) => isSameIdentity(copy, identity));
}
