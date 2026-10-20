/**
 * Выполнение скрипта в странице webview сразу, а не после загрузки:
 * executeJavaScript у тега webview ждёт конца загрузки, а у тяжёлых
 * страниц это секунды. mainFrame выполняет код в текущем документе
 */
import { webContents } from 'electron';
import { createLogger } from '../shared/logger';
import { handleIpc } from './ipc';

const log = createLogger('PageScript');

export default function registerPageScriptHandler(): void {
  handleIpc('execute-in-page', async (_event, { webContentsId, code }) => {
    const target = webContents.fromId(webContentsId);
    if (!target || target.isDestroyed() || target.getType() !== 'webview') {
      return { ok: false };
    }

    try {
      return {
        ok: true,
        value: await target.mainFrame.executeJavaScript(code),
      };
    } catch (error: any) {
      log.debug('Page script failed:', error?.message);
      return { ok: false };
    }
  });
}
