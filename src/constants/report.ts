/**
 * Константы обращения в GitHub Issues и сборка ссылки на форму
 */

import { UPDATE_REPO_NAME, UPDATE_REPO_OWNER } from './update';

/**
 * Страница создания нового issue
 */
export const REPORT_NEW_ISSUE_URL = `https://github.com/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/issues/new`;

/**
 * Ограничения полей формы обращения
 */
export const REPORT_TITLE_MAX = 120;
export const REPORT_DESCRIPTION_MAX = 4000;

/**
 * Категория обращения
 */
export type ReportKind = 'bug' | 'playback' | 'feature' | 'other';

/**
 * Заголовки категорий для списка и префикса issue
 */
export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  bug: 'Ошибка в приложении',
  playback: 'Проблема с воспроизведением',
  feature: 'Предложение',
  other: 'Другое',
};

/**
 * Порядок категорий в списке
 */
export const REPORT_KINDS: readonly ReportKind[] = [
  'bug',
  'playback',
  'feature',
  'other',
];

export const REPORT_KIND_DEFAULT: ReportKind = 'bug';

/**
 * Обращение, заполненное пользователем
 */
export interface ReportPayload {
  kind: ReportKind;
  title: string;
  description: string;
}

/**
 * Окружение, подставляемое в тело issue
 */
export interface ReportEnvironment {
  appVersion: string;
  os: string;
}

const OS_NAMES: Record<string, string> = {
  win32: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
};

/**
 * Собирает читаемое название ОС из данных процесса
 */
export const formatOs = (
  platform: string,
  release: string,
  arch: string,
): string => `${OS_NAMES[platform] || platform} ${release} (${arch})`;

/**
 * Собирает заголовок issue с префиксом категории
 */
export const buildIssueTitle = (payload: ReportPayload): string => {
  const title = payload.title.trim().slice(0, REPORT_TITLE_MAX);
  const prefix = REPORT_KIND_LABELS[payload.kind] || REPORT_KIND_LABELS.other;

  return title ? `[${prefix}] ${title}` : `[${prefix}]`;
};

/**
 * Собирает тело issue из описания и окружения
 */
export const buildIssueBody = (
  payload: ReportPayload,
  environment: ReportEnvironment,
): string => {
  const description =
    payload.description.trim().slice(0, REPORT_DESCRIPTION_MAX) ||
    '_Описание не заполнено_';

  return [
    '### Описание',
    '',
    description,
    '',
    '### Окружение',
    '',
    `- Версия приложения: ${environment.appVersion}`,
    `- ОС: ${environment.os}`,
    '',
  ].join('\n');
};

/**
 * Собирает ссылку на предзаполненную форму нового issue
 */
export const buildIssueUrl = (
  payload: ReportPayload,
  environment: ReportEnvironment,
): string => {
  const params = new URLSearchParams({
    title: buildIssueTitle(payload),
    body: buildIssueBody(payload, environment),
  });

  return `${REPORT_NEW_ISSUE_URL}?${params.toString()}`;
};
