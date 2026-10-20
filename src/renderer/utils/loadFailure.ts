/** ERR_ABORTED: загрузку прервал новый переход, это не сбой сайта */
const ERR_ABORTED = -3;

/**
 * Коды ответа, при которых сайт по сути не открылся: прокси или Cloudflare
 * не достучались до сервера. 0 — сеть не ответила вовсе. 503 и 403 сюда не
 * входят: так отвечают и страницы проверки «вы не робот»
 */
export function isSiteDownStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 502 ||
    status === 504 ||
    status === 530 ||
    (status >= 520 && status <= 527)
  );
}

/**
 * Открылась ли страница при переходе: код ответа известен только при
 * полной загрузке; без него (переход внутри страницы) — открылась
 */
export function isPageLoaded(httpResponseCode?: number): boolean {
  return httpResponseCode === undefined || !isSiteDownStatus(httpResponseCode);
}

export interface LoadFailureEvent {
  errorCode?: number;
  validatedURL?: string;
  isMainFrame?: boolean;
}

/**
 * Хост страницы, которая не загрузилась, если показывать страницу ошибки:
 * только для основного фрейма, не для прерванных переходов и не для
 * адресов-команд вроде открытия плеера; иначе null
 */
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
