import { useCallback, useEffect, useState } from 'react';
import { CONNECTIVITY_CHECK_INTERVAL_MS } from '../../constants';
import { connectivityMonitor } from '../services/connectivity';

/**
 * Отслеживает доступность сайта, а не только сетевого интерфейса
 */
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const check = useCallback(async () => {
    setIsOnline(await connectivityMonitor.check());
  }, []);

  useEffect(() => {
    check();

    const timer = setInterval(check, CONNECTIVITY_CHECK_INTERVAL_MS);

    const onOnline = () => {
      connectivityMonitor.invalidate();
      check();
    };

    const onOffline = () => {
      connectivityMonitor.markOffline();
      setIsOnline(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [check]);

  return isOnline;
}

export default useOnlineStatus;
