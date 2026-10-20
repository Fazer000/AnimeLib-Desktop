/**
 * Проверка зеркал сайтов из main-процесса: здесь виден код ответа, которого
 * нет у запросов страницы к чужому домену, а сеть та же, что у webview
 */
import { net } from 'electron';
import { MIRROR_CHECK_TIMEOUT } from '../constants';
import { createLogger } from '../shared/logger';
import { handleIpc } from './ipc';

const log = createLogger('MirrorCheck');

export default function registerMirrorCheckHandler(): void {
  handleIpc('check-mirror', async (_event, url) => {
    const started = Date.now();

    try {
      const response = await net.fetch(url, {
        signal: AbortSignal.timeout(MIRROR_CHECK_TIMEOUT),
        cache: 'no-store',
      });
      response.body?.cancel().catch(() => {});
      return { status: response.status, ms: Date.now() - started };
    } catch (error: any) {
      log.debug('Mirror unreachable:', url, error?.message);
      return { status: 0, ms: Date.now() - started };
    }
  });
}
