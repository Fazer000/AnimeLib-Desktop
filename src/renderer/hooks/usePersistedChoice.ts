import { useCallback, useState } from 'react';
import { createLogger } from '../../shared/logger';

const log = createLogger('usePersistedChoice');

/**
 * Строковое значение из набора, переживающее перезапуск через localStorage.
 * Неизвестное сохранённое значение заменяется значением по умолчанию
 */
export function usePersistedChoice<T extends string>(
  key: string,
  isValid: (value: unknown) => value is T,
  defaultValue: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return isValid(stored) ? stored : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch (error) {
        log.error(`Error saving ${key}:`, error);
      }
    },
    [key],
  );

  return [value, update];
}

export default usePersistedChoice;
