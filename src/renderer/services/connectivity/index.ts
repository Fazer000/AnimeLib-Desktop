/**
 * Экспорт сервиса проверки связи
 */
import type { ConnectivityProbeResult } from '../../../constants';
import { ConnectivityMonitor } from './ConnectivityMonitor';
import { getHomeUrl } from '../../utils/urlHelpers';

/** Опрашивает главную AnimeLib через main-процесс */
const probe = async (): Promise<ConnectivityProbeResult> => {
  const api = window.electron?.electronAPI;

  if (!api?.offlineCheckConnection) {
    return { ok: true, reason: 'ok' };
  }

  return api
    .offlineCheckConnection(getHomeUrl())
    .catch((): ConnectivityProbeResult => ({ ok: false, reason: 'network' }));
};

export const connectivityMonitor = new ConnectivityMonitor({
  probe,
  isInterfaceOnline: () => navigator.onLine,
});

/**
 * Ждёт пробу столько, сколько нужно
 */
export const checkConnection = (): Promise<boolean> =>
  connectivityMonitor.check();

/**
 * Ждёт пробу не дольше дедлайна, не блокируя интерфейс
 */
export const checkConnectionFast = (): Promise<boolean> =>
  connectivityMonitor.checkFast();

export { ConnectivityMonitor };
export type { ConnectivityMonitorConfig } from './ConnectivityMonitor';
