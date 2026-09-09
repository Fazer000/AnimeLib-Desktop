/**
 * Экспорт сервиса проверки связи
 */
import type { ConnectivityProbeResult } from '../../../constants';
import { ConnectivityMonitor } from './ConnectivityMonitor';

/**
 * Опрашивает сайт через main-процесс
 */
const probe = async (): Promise<ConnectivityProbeResult> => {
  const api = window.electron?.electronAPI;

  if (!api?.offlineCheckConnection) {
    return { ok: true, reason: 'ok' };
  }

  return api
    .offlineCheckConnection()
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
