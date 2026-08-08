import { useCallback, useEffect, useRef, useState } from 'react';
import { UPDATE_CHECK_INTERVAL_MS, UpdateInfo } from '../../constants';

export type UpdateStatus = 'idle' | 'available' | 'downloading' | 'error';

interface UpdateChecker {
  updateInfo: UpdateInfo | null;
  status: UpdateStatus;
  progress: number;
  startUpdate: () => Promise<void>;
}

/**
 * Следит за наличием новой версии и запускает обновление
 */
function useUpdateChecker(): UpdateChecker {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const statusRef = useRef<UpdateStatus>('idle');

  useEffect(() => {
    const api = window.electron?.electronAPI;

    if (!api?.checkForUpdate) {
      return undefined;
    }

    let cancelled = false;

    const check = async () => {
      const info = await api.checkForUpdate().catch(() => null);

      if (
        cancelled ||
        !info?.available ||
        statusRef.current === 'downloading'
      ) {
        return;
      }

      setUpdateInfo(info);
      setStatus('available');
      statusRef.current = 'available';
    };

    check();
    const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;

    if (!ipc) {
      return undefined;
    }

    return ipc.on('update-download-progress', (percent) =>
      setProgress(Number(percent) || 0),
    );
  }, []);

  const startUpdate = useCallback(async () => {
    const api = window.electron?.electronAPI;

    if (!api?.downloadUpdate || statusRef.current === 'downloading') {
      return;
    }

    statusRef.current = 'downloading';
    setStatus('downloading');
    setProgress(0);

    const result = await api.downloadUpdate().catch(() => null);

    if (!result?.success) {
      statusRef.current = 'error';
      setStatus('error');
      api.openReleasePage();
    }
  }, []);

  return { updateInfo, status, progress, startUpdate };
}

export default useUpdateChecker;
