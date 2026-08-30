/**
 * Журнал сбоев и перехват падений главного процесса.
 * Пишет на диск независимо от createLogger, который в продакшене отключён.
 */
import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, WebContents, dialog, ipcMain } from 'electron';
import { APP_NAME, APP_VERSION } from '../constants';

const LOG_FILE = 'crash.log';
const MAX_LOG_BYTES = 512 * 1024;
const MAX_RENDERER_RELOADS = 3;

const reloads = new Map<number, number>();

const isDev = process.env.NODE_ENV === 'development';

/** Путь к журналу в папке данных приложения. */
export const getCrashLogPath = (): string =>
  path.join(app.getPath('userData'), 'logs', LOG_FILE);

/** Разворачивает ошибку в текст со стеком. */
const describe = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

/** Обрезает журнал, когда он перерос лимит, чтобы не расти бесконечно. */
const rotate = (file: string): void => {
  try {
    if (fs.statSync(file).size > MAX_LOG_BYTES) {
      fs.renameSync(file, `${file}.1`);
    }
  } catch {
    // журнала ещё нет
  }
};

/** Добавляет запись в журнал сбоев. */
export const logCrash = (scope: string, error: unknown): void => {
  const file = getCrashLogPath();

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    rotate(file);

    const entry = [
      `[${new Date().toISOString()}] ${APP_NAME} ${APP_VERSION} — ${scope}`,
      describe(error),
      '',
    ].join('\n');

    fs.appendFileSync(file, entry, 'utf8');
  } catch {
    // писать некуда — молча продолжаем, падать здесь нельзя
  }
};

/** Показывает пользователю, что произошло, и где искать подробности. */
const showFatalDialog = (scope: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);

  dialog.showMessageBoxSync({
    type: 'error',
    title: `${APP_NAME} — ошибка`,
    message: 'Приложение столкнулось с ошибкой и будет закрыто',
    detail: `${scope}: ${message}\n\nПодробности: ${getCrashLogPath()}`,
    buttons: ['Закрыть'],
  });
};

/**
 * Перехватывает падения главного процесса, гибель рендерера и ошибки из UI.
 * Вызывать до создания окна.
 */
export const registerCrashHandlers = (
  getWindow: () => BrowserWindow | null,
): void => {
  process.on('uncaughtException', (error) => {
    logCrash('uncaughtException', error);
    showFatalDialog('Сбой главного процесса', error);
    app.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logCrash('unhandledRejection', reason);
  });

  app.on('render-process-gone', (_event, contents: WebContents, details) => {
    logCrash('render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode,
      type: contents.isDestroyed() ? 'unknown' : contents.getType(),
      url: contents.isDestroyed() ? '' : contents.getURL(),
    });

    if (details.reason === 'clean-exit' || contents.isDestroyed()) {
      return;
    }

    const attempts = (reloads.get(contents.id) ?? 0) + 1;
    reloads.set(contents.id, attempts);

    if (attempts <= MAX_RENDERER_RELOADS) {
      contents.reload();
      return;
    }

    const isGuest = contents.getType() === 'webview';
    const window = getWindow();

    if (window && !window.isDestroyed()) {
      dialog.showMessageBoxSync(window, {
        type: 'error',
        title: `${APP_NAME} — ошибка`,
        message: isGuest
          ? 'Страница сайта повторно аварийно завершилась'
          : 'Окно приложения повторно аварийно завершилось',
        detail: `Причина: ${details.reason}\n\nПодробности: ${getCrashLogPath()}`,
        buttons: ['Закрыть'],
      });
    }

    if (!isGuest) {
      app.exit(1);
    }
  });

  app.on('child-process-gone', (_event, details) => {
    logCrash('child-process-gone', details);
  });

  ipcMain.on('report-renderer-error', (_event, payload: unknown) => {
    logCrash('renderer', payload);
  });

  // Ручная проверка перехвата, только в dev-сборке
  if (isDev) {
    ipcMain.on('debug-crash-main', () => {
      setTimeout(() => {
        throw new Error('Проверка перехвата: намеренное падение main');
      }, 0);
    });

    ipcMain.on('debug-crash-renderer', () => {
      getWindow()?.webContents.forcefullyCrashRenderer();
    });
  }
};

export default registerCrashHandlers;
