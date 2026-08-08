import { useEffect, useState } from 'react';
import { OfflineSnapshot } from '../../constants';
import { offlineStore } from '../services/offline';

/**
 * Держит состояние оффлайн-библиотеки актуальным
 */
function useOfflineLibrary(): OfflineSnapshot {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot>(() =>
    offlineStore.getSnapshot(),
  );

  useEffect(() => offlineStore.subscribe(setSnapshot), []);

  return snapshot;
}

export default useOfflineLibrary;
