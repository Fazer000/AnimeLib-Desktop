/**
 * Оценка тайтла: действие кнопки, выбор звезды и тон оценки, как на сайте
 */

export type RatingAction = 'store' | 'update' | 'delete';

export type RatingTone = 'negative' | 'neutral' | 'positive';

const RATING_ACTION_LABELS: Record<RatingAction, string> = {
  store: 'Оценить',
  update: 'Изменить',
  delete: 'Удалить оценку',
};

/**
 * Что сделает кнопка: без прежней оценки — поставит, с новой — изменит,
 * со снятой или той же — удалит
 */
export function getRatingAction(userVote: number, score: number): RatingAction {
  if (!userVote) return 'store';

  return score && score !== userVote ? 'update' : 'delete';
}

/**
 * Подпись кнопки для действия
 */
export function getRatingActionLabel(action: RatingAction): string {
  return RATING_ACTION_LABELS[action];
}

/**
 * Повторный клик по выбранной звезде снимает оценку
 */
export function toggleRatingScore(current: number, star: number): number {
  return current === star ? 0 : star;
}

/**
 * Тон оценки: до 4 — отрицательная, от 7 — положительная
 */
export function getRatingTone(score: number): RatingTone {
  if (!score) return 'neutral';
  if (score <= 4) return 'negative';
  if (score >= 7) return 'positive';

  return 'neutral';
}

/**
 * Оценка, которая уходит на сервер: удаление передаётся нулём
 */
export function getSubmittedScore(userVote: number, score: number): number {
  return getRatingAction(userVote, score) === 'delete' ? 0 : score;
}
