/**
 * Проверка доступности сети и сайта
 */

/**
 * Возвращает true, если сеть и API сайта доступны
 */
export async function checkConnection(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const api = window.electron?.electronAPI;

  if (!api?.offlineCheckConnection) {
    return true;
  }

  return Boolean(await api.offlineCheckConnection().catch(() => false));
}

export default checkConnection;
