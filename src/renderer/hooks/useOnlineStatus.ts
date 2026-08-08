import { useCallback, useEffect, useState } from 'react';
import { CONNECTIVITY_CHECK_INTERVAL_MS } from '../../constants';
import { checkConnection } from '../utils/connectivity';

/**
 * Отслеживает доступность сайта, а не только сетевого интерфейса
 */
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const check = useCallback(async () => {
    setIsOnline(await checkConnection());
  }, []);

  useEffect(() => {
    check();

    const timer = setInterval(check, CONNECTIVITY_CHECK_INTERVAL_MS);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', check);
    window.addEventListener('offline', onOffline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', onOffline);
    };
  }, [check]);

  return isOnline;
}

export default useOnlineStatus;
