/** ERR_ABORTED: загрузку прервал новый переход, это не сбой сайта */
import { isSiteDownStatus } from '../../shared/siteStatus';

const ERR_ABORTED = -3;

export { isSiteDownStatus };

/** Открылась ли страница при переходе */
export function isPageLoaded(httpResponseCode?: number): boolean {
  return httpResponseCode === undefined || !isSiteDownStatus(httpResponseCode);
}

export interface LoadFailureEvent {
  errorCode?: number;
  validatedURL?: string;
  isMainFrame?: boolean;
}

/** Хост страницы, которая не загрузилась, если показывать страницу ошибки */
export function failedPageHost(
  event: LoadFailureEvent,
  ignoredPrefixes: string[] = [],
): string | null {
  const url = String(event.validatedURL || '');
  if (event.isMainFrame === false || event.errorCode === ERR_ABORTED) {
    return null;
  }
  if (ignoredPrefixes.some((prefix) => url.startsWith(prefix))) return null;

  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? hostname : null;
  } catch {
    return null;
  }
}
