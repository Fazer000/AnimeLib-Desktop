import { useEffect, useState } from 'react';
import type { MirrorStates } from '../utils/siteMirrors';
import { isSiteDownStatus } from '../utils/loadFailure';
import { createLogger } from '../../shared/logger';

const log = createLogger('useMirrorStatus');

/** Последние известные состояния: повторная проверка не мигает «проверкой» */
const lastStates: MirrorStates = {};

/** Открывается ли зеркало: запрос идёт из main-процесса, где виден код ответа */
async function checkMirror(home: string): Promise<number> {
  const result = await window.electron?.ipcRenderer?.invoke(
    'check-mirror',
    home,
  );
  if (!result || isSiteDownStatus(result.status)) {
    throw new Error(`Mirror status ${result?.status ?? 'unknown'}`);
  }
  return result.ms;
}

/** Проверяет доступность зеркал, пока active; результат копится по мере ответов */
export default function useMirrorStatus(
  homes: string[],
  active = true,
): MirrorStates {
  const [states, setStates] = useState<MirrorStates>(() => ({
    ...lastStates,
  }));
  const key = homes.join('|');

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    const update = (home: string, state: MirrorStates[string]) => {
      lastStates[home] = state;
      if (!cancelled) setStates((prev) => ({ ...prev, [home]: state }));
    };

    key.split('|').forEach(async (home) => {
      if (!home) return;
      if (!lastStates[home]) update(home, { status: 'checking' });

      try {
        update(home, { status: 'ok', ms: await checkMirror(home) });
      } catch (error) {
        log.debug('Mirror unreachable:', home, error);
        update(home, { status: 'fail' });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key, active]);

  return states;
}
