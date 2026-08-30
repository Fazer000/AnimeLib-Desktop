import { createLogger } from '../../shared/logger';

const log = createLogger('DebugApi');

const IS_DEV = process.env.NODE_ENV === 'development';

/** Отладочные команды для ручной проверки перехвата сбоев. */
export interface AnimeLibDebugApi {
  /** Роняет главный процесс: журнал, диалог, выход. */
  crashMain: () => void;
  /** Роняет процесс окна: сработает render-process-gone и перезагрузка. */
  crashRenderer: () => void;
  /** Шлёт в журнал ошибку рендера, не ломая интерфейс. */
  reportError: (message?: string) => void;
  /** Путь к журналу сбоев печатается в консоль. */
  where: () => void;
}

/**
 * Публикует window.animeLibDebug. Только в dev-сборке: в продакшене
 * функция ничего не делает и в бандл не попадает содержимое ветки.
 */
export function installDebugApi(): void {
  if (!IS_DEV) return;

  window.animeLibDebug = {
    crashMain: () => {
      window.electron?.ipcRenderer?.sendMessage('debug-crash-main');
    },
    crashRenderer: () => {
      window.electron?.ipcRenderer?.sendMessage('debug-crash-renderer');
    },
    reportError: (message = 'Проверка журнала сбоев') => {
      window.electron?.electronAPI?.reportRendererError?.({
        message,
        stack: new Error(message).stack,
      });
    },
    where: () => {
      log.info('Журнал сбоев: %APPDATA%/animelib-desktop/logs/crash.log');
    },
  };

  log.debug('Debug API available: window.animeLibDebug');
}

export default installDebugApi;
