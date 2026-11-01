/** Видеосерверы AnimeLib: порядок перебора и ссылки на файл серии */
import { ANIMELIB_VIDEO_SERVERS, AnimelibVideoServer } from '../constants';

/** Серверы для плеера: сначала указанный в video_domain, затем остальные */
export function orderVideoServers(
  videoDomain?: string | null,
  servers: readonly AnimelibVideoServer[] = ANIMELIB_VIDEO_SERVERS,
): AnimelibVideoServer[] {
  const own = servers.find((server) => server.id === videoDomain);
  return own
    ? [own, ...servers.filter((server) => server !== own)]
    : [...servers];
}

/** Домены видеосерверов без повторов */
export function videoServerOrigins(
  servers: readonly AnimelibVideoServer[] = ANIMELIB_VIDEO_SERVERS,
): string[] {
  return [...new Set(servers.map((server) => new URL(server.url).origin))];
}

/** Путь файла: у ссылки на известный сервер срезается адрес сервера */
function videoPath(
  href: string,
  servers: readonly AnimelibVideoServer[],
): string {
  if (!href.startsWith('http')) return href;

  const server = [...servers]
    .sort((a, b) => b.url.length - a.url.length)
    .find((item) => href.startsWith(`${item.url}/`));
  return server ? href.slice(server.url.length) : new URL(href).pathname;
}

/** Ссылки на файл серии по серверам в порядке перебора */
export function buildVideoUrls(
  href: string,
  videoDomain?: string | null,
  servers: readonly AnimelibVideoServer[] = ANIMELIB_VIDEO_SERVERS,
): string[] {
  if (href.startsWith('//')) return [`https:${href}`];

  const path = videoPath(href, servers);
  const fromServers = orderVideoServers(videoDomain, servers).map(
    (server) => `${server.url}${path.startsWith('/') ? '' : '/'}${path}`,
  );

  return href.startsWith('http')
    ? [href, ...fromServers.filter((url) => url !== href)]
    : fromServers;
}
