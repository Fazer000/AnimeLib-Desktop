/**
 * Поиск серии по введённому номеру
 */

const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Возвращает индекс серии по номеру: сначала точное совпадение строки,
 * затем числовое, чтобы «5» находило «05», а «12,5» — «12.5»
 */
export function findEpisodeIndex(numbers: string[], query: string): number {
  const normalized = query.trim().replace(',', '.');

  if (!normalized) return -1;

  const exact = numbers.indexOf(normalized);

  if (exact >= 0) return exact;

  if (!NUMBER_PATTERN.test(normalized)) return -1;

  const target = Number(normalized);

  return numbers.findIndex(
    (number) => number.trim() !== '' && Number(number) === target,
  );
}

export default findEpisodeIndex;
