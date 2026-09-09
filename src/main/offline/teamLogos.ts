import type { OfflineAnime } from '../../constants';

/**
 * Ищет уже скачанный логотип озвучки в каталоге
 */
export function findTeamLogoFileName(
  anime: OfflineAnime[],
  teamId: number,
): string {
  if (!teamId) {
    return '';
  }

  const match = anime
    .flatMap((entry) => entry.episodes)
    .find((episode) => episode.teamId === teamId && !!episode.teamLogoFileName);

  return match?.teamLogoFileName || '';
}

/**
 * Собирает имена файлов логотипов, на которые ссылается каталог
 */
export function collectTeamLogoFileNames(anime: OfflineAnime[]): string[] {
  const names = new Set<string>();

  anime.forEach((entry) => {
    entry.episodes.forEach((episode) => {
      if (episode.teamLogoFileName) {
        names.add(episode.teamLogoFileName);
      }
    });
  });

  return Array.from(names);
}
