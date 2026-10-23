/** Оценка тайтла на Shikimori и число проголосовавших. */
export interface ShikimoriRating {
  score: number;
  votes: number;
}

interface RawShikimoriAnime {
  score?: string | number | null;
  rates_scores_stats?: Array<{ value?: number | null }> | null;
}

/** Оценка из ответа /animes/{id}: score — строка вида «5.87», голоса — сумма распределения оценок */
export function toShikimoriRating(raw: unknown): ShikimoriRating | null {
  const anime = raw as RawShikimoriAnime | null;
  const score = Number(anime?.score);
  const votes = (anime?.rates_scores_stats ?? []).reduce(
    (sum, item) => sum + (Number(item?.value) || 0),
    0,
  );

  if (!Number.isFinite(score) || score <= 0 || votes <= 0) return null;
  return { score, votes };
}

/**
 * Оценка для подписи: две цифры после точки, как на Shikimori
 */
export function formatShikimoriScore(score: number): string {
  return score.toFixed(2);
}
