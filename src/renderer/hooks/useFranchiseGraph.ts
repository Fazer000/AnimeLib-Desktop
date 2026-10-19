import { useEffect, useMemo, useState } from 'react';
import {
  FranchiseState,
  hasFranchiseCrawl,
  subscribeFranchise,
} from '../services/franchise/franchiseLoader';
import { buildShikimoriGraph } from '../utils/shikimoriFranchise';
import { FRANCHISE_START_DELAY_MS } from '../../constants';

const EMPTY: FranchiseState = {
  graph: null,
  shikimori: null,
  progress: null,
  done: false,
  failed: false,
};

/**
 * Граф франшизы тайтла, растущий по ходу загрузки. shikimoriId: число —
 * франшиза из Shikimori, null — у тайтла его нет и граф собирается обходом
 * Animelib, undefined — ещё неизвестно, загрузка ждёт. Грузится, только
 * когда включён, и с паузой, чтобы не мешать загрузке плеера
 */
function useFranchiseGraph(
  slugUrl: string,
  shikimoriId: number | null | undefined,
  enabled: boolean,
): FranchiseState {
  const [state, setState] = useState<FranchiseState>(EMPTY);

  useEffect(() => {
    if (!enabled || !slugUrl || shikimoriId === undefined) return undefined;

    let unsubscribe: (() => void) | null = null;
    setState(EMPTY);

    const timer = setTimeout(
      () => {
        unsubscribe = subscribeFranchise(slugUrl, shikimoriId, setState);
      },
      hasFranchiseCrawl(slugUrl, shikimoriId) ? 0 : FRANCHISE_START_DELAY_MS,
    );

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [slugUrl, shikimoriId, enabled]);

  return useMemo(() => {
    if (!state.shikimori || typeof shikimoriId !== 'number') return state;

    return {
      ...state,
      graph: buildShikimoriGraph(
        state.shikimori.franchise,
        { id: shikimoriId, slug: slugUrl },
        state.shikimori.matches,
      ),
    };
  }, [state, shikimoriId, slugUrl]);
}

export default useFranchiseGraph;
