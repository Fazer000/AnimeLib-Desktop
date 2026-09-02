/**
 * Открытие предзаполненной формы issue в браузере
 */
import os from 'os';
import { shell } from 'electron';
import { APP_VERSION, buildIssueUrl, formatOs } from '../constants';
import { onIpc } from './ipc';
import { createLogger } from '../shared/logger';

const log = createLogger('Report');

/**
 * Регистрирует обработчик обращения из renderer
 */
export const registerReportHandlers = (): void => {
  onIpc('open-issue-page', (_event, payload) => {
    const url = buildIssueUrl(payload, {
      appVersion: APP_VERSION,
      os: formatOs(process.platform, os.release(), process.arch),
    });

    log.debug('Opening issue form:', payload.kind);
    shell.openExternal(url);
  });

  log.debug('Report handlers registered');
};

export default registerReportHandlers;
