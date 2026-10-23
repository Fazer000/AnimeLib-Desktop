/**
 * Плашка статуса серии: филлер, рекап, спешл
 */

export interface EpisodeBadge {
  abbr: string;
  label: string;
}

interface EpisodeStatusLike {
  abbr: string | null;
  label: string;
}

/** Плашка есть у серий, которым сайт задал сокращение статуса */
export function getEpisodeBadge(
  status: EpisodeStatusLike | null | undefined,
): EpisodeBadge | null {
  const abbr = status?.abbr?.trim();

  if (!abbr) return null;

  return { abbr, label: status?.label?.trim() || abbr };
}

export default getEpisodeBadge;
