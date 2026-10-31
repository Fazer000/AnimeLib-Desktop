/** Разбор ответов сайта: открылся ли он и что проверять пробой связи */
import {
  CONNECTIVITY_PROBE_URL,
  ConnectivityProbeResult,
  LIB_SITES,
} from '../constants';

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

/** Вердикт пробы связи по коду ответа страницы сайта */
export function probeVerdict(status: number): ConnectivityProbeResult {
  const ok = status > 0 && status < 500 && !isSiteDownStatus(status);
  return { ok, reason: ok ? 'ok' : 'network' };
}

/** Адрес пробы: зеркало AnimeLib по https, иначе адрес по умолчанию */
export function probeTarget(url: unknown): string {
  const animeHosts = LIB_SITES.filter((site) => site.kind === 'anime').flatMap(
    (site) => site.hosts,
  );

  try {
    const { protocol, hostname } = new URL(String(url));
    const host = hostname.toLowerCase();
    const known = animeHosts.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    return protocol === 'https:' && known
      ? String(url)
      : CONNECTIVITY_PROBE_URL;
  } catch {
    return CONNECTIVITY_PROBE_URL;
  }
}
