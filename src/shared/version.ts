/**
 * Сравнение версий приложения. Вынесено из updater, чтобы не тянуть electron.
 */

/** Приводит версию к массиву чисел; нечисловые части считаются нулём. */
export const parseVersion = (value: string): number[] =>
  value
    .replace(/^v/i, '')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);

/** Проверяет, что latest новее current. */
export const isNewerVersion = (latest: string, current: string): boolean => {
  const left = parseVersion(latest);
  const right = parseVersion(current);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) {
      return diff > 0;
    }
  }

  return false;
};
