import { useCallback, useState } from 'react';
import { createLogger } from '../../shared/logger';

const log = createLogger('usePersistedFlag');

/**
 * Булев флаг, переживающий перезапуск через localStorage.
 * Возвращает значение и сеттер, который сразу пишет в хранилище.
 */
export function usePersistedFlag(
  key: string,
  defaultValue: boolean,
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? defaultValue : stored === 'true';
    } catch {
      return defaultValue;
    }
  });

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, next.toString());
      } catch (error) {
        log.error(`Error saving ${key}:`, error);
      }
    },
    [key],
  );

  return [value, update];
}

export default usePersistedFlag;
