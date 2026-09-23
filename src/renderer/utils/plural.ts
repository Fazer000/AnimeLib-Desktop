/**
 * Склонение слова после числа
 */

/**
 * Выбирает форму по числу: 1 день, 2 дня, 5 дней, 11 дней, 21 день
 */
export function pluralRu(
  count: number,
  forms: readonly [one: string, few: string, many: string],
): string {
  const tens = Math.abs(Math.trunc(count)) % 100;
  const units = tens % 10;

  if (tens > 10 && tens < 20) return forms[2];
  if (units === 1) return forms[0];
  if (units >= 2 && units <= 4) return forms[1];

  return forms[2];
}

export default pluralRu;
