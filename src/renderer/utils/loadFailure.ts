/** ERR_ABORTED: загрузку прервал новый переход, это не сбой сайта */
const ERR_ABORTED = -3;

/** Коды ответа, при которых сайт по сути не открылся */
export function isSiteDownStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 502 ||
    status === 504 ||
    status === 530 ||
    (status >= 520 && status <= 527)
  );
}

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
