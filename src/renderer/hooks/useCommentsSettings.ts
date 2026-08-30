import { useCallback, useState } from 'react';
import {
  COMMENTS_SETTINGS_DEFAULTS,
  COMMENTS_SETTINGS_STORAGE_KEY,
} from '../../constants';

import { createLogger } from '../../shared/logger';

const log = createLogger('useCommentsSettings');

export interface CommentsSettings {
  disabled: boolean;
  highlightNew: boolean;
  collapseFromLevel: number;
}

/**
 * Читает настройки комментариев из localStorage
 */
function readSettings(): CommentsSettings {
  try {
    const raw = localStorage.getItem(COMMENTS_SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...COMMENTS_SETTINGS_DEFAULTS, ...JSON.parse(raw) };
    }
  } catch (error) {
    log.error('Failed to read settings:', error);
  }

  return { ...COMMENTS_SETTINGS_DEFAULTS };
}

/**
 * Хранит настройки комментариев с сохранением между сессиями
 */
export default function useCommentsSettings(): [
  CommentsSettings,
  (patch: Partial<CommentsSettings>) => void,
] {
  const [settings, setSettings] = useState<CommentsSettings>(readSettings);

  const update = useCallback((patch: Partial<CommentsSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };

      try {
        localStorage.setItem(
          COMMENTS_SETTINGS_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch (error) {
        log.error('Failed to save settings:', error);
      }

      return next;
    });
  }, []);

  return [settings, update];
}
