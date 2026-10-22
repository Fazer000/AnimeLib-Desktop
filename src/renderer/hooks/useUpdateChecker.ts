import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UPDATE_CHECK_INTERVAL_MS,
  UpdateFailure,
  UpdateInfo,
} from '../../constants';

import { isUpdateBusy, UpdateStatus } from '../utils/updateStatus';

export type { UpdateStatus } from '../utils/updateStatus';
export { isUpdateBusy } from '../utils/updateStatus';

interface UpdateChecker {
  updateInfo: UpdateInfo | null;
  status: UpdateStatus;
  failure: UpdateFailure | null;
  manualCommand: string | null;
  progress: number;
  startUpdate: () => Promise<void>;
  openRelease: () => void;
}

/**
 * Следит за наличием новой версии и запускает обновление
 */
function useUpdateChecker(): UpdateChecker {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [failure, setFailure] = useState<UpdateFailure | null>(null);
  const [manualCommand, setManualCommand] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const statusRef = useRef<UpdateStatus>('idle');

  const changeStatus = useCallback((next: UpdateStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    const api = window.electron?.electronAPI;

    if (!api?.checkForUpdate) {
      return undefined;
    }

    let cancelled = false;

    const check = async () => {
      const info = await api.checkForUpdate().catch(() => null);

      if (cancelled || !info?.available || isUpdateBusy(statusRef.current)) {
        return;
      }

      setUpdateInfo(info);
      changeStatus('available');
    };

    check();
    const timer = setInterval(check, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [changeStatus]);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;

    if (!ipc) {
      return undefined;
    }

    const offProgress = ipc.on('update-download-progress', (percent) =>
      setProgress(Number(percent) || 0),
    );
    const offStage = ipc.on('update-install-stage', (stage) =>
      changeStatus(stage),
    );

    return () => {
      offProgress();
      offStage();
    };
  }, [changeStatus]);

  const startUpdate = useCallback(async () => {
    const api = window.electron?.electronAPI;

    if (!api?.downloadUpdate || isUpdateBusy(statusRef.current)) {
      return;
    }

    changeStatus('downloading');
    setFailure(null);
    setManualCommand(null);
    setProgress(0);

    const result = await api.downloadUpdate().catch(() => null);

    if (!result?.success) {
      const reason = result?.failure ?? 'download';
      changeStatus('error');
      setFailure(reason);
      setManualCommand(result?.manualCommand ?? null);
      if (reason === 'download') api.openReleasePage();
    }
  }, [changeStatus]);

  const openRelease = useCallback(() => {
    window.electron?.electronAPI?.openReleasePage();
  }, []);

  return {
    updateInfo,
    status,
    failure,
    manualCommand,
    progress,
    startUpdate,
    openRelease,
  };
}

export default useUpdateChecker;
