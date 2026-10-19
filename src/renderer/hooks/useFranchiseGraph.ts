import { useEffect, useState } from 'react';
import {
  FranchiseState,
  hasFranchiseCrawl,
  subscribeFranchise,
} from '../services/franchise/franchiseLoader';
import { FRANCHISE_START_DELAY_MS } from '../../constants';

const EMPTY: FranchiseState = {
  graph: null,
  progress: null,
  done: false,
  failed: false,
};

/**
 * Граф франшизы тайтла, растущий по ходу обхода. Грузится, только когда
 * включён, и с паузой, чтобы не мешать загрузке плеера
 */
function useFranchiseGraph(slugUrl: string, enabled: boolean): FranchiseState {
  const [state, setState] = useState<FranchiseState>(EMPTY);

  useEffect(() => {
    if (!enabled || !slugUrl) return undefined;

    let unsubscribe: (() => void) | null = null;
    setState(EMPTY);

    const timer = setTimeout(
      () => {
        unsubscribe = subscribeFranchise(slugUrl, setState);
      },
      hasFranchiseCrawl(slugUrl) ? 0 : FRANCHISE_START_DELAY_MS,
    );

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [slugUrl, enabled]);

  return state;
}

export default useFranchiseGraph;
