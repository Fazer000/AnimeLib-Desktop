import { LIB_SITES, LibSite } from '../../constants';
import { chosenMirror, readSiteMirrors } from './siteMirrors';

/**
 * Сайт сети Lib по имени хоста, в том числе по поддомену (v5.animelib.org)
 */
export function findLibSite(
  hostname: string,
  sites: LibSite[] = LIB_SITES,
): LibSite | null {
  const host = hostname.toLowerCase();

  return (
    sites.find((site) =>
      site.hosts.some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
      ),
    ) ?? null
  );
}

/**
 * Сайт сети по адресу страницы; чужой или неразборчивый адрес — null
 */
export function findLibSiteByUrl(
  url: string,
  sites: LibSite[] = LIB_SITES,
): LibSite | null {
  try {
    return findLibSite(new URL(url).hostname, sites);
  } catch {
    return null;
  }
}

/**
 * Главная сайта на выбранном зеркале; у AnimeLib — адрес из настроек
 */
export function libSiteHomeUrl(
  site: LibSite,
  animeHomeUrl: string,
  homes: Record<number, string> = readSiteMirrors(),
): string {
  return site.kind === 'anime' ? animeHomeUrl : chosenMirror(site, homes);
}

/** Куда ведёт «Домой» */
export function currentSiteHomeUrl(
  pageUrl: string,
  animeHomeUrl: string,
  sites: LibSite[] = LIB_SITES,
): string {
  const site = findLibSiteByUrl(pageUrl, sites);
  if (!site || site.kind === 'anime') return animeHomeUrl;

  return `${new URL(pageUrl).origin}/`;
}

/** Полный адрес пути на сайте сети на выбранном зеркале */
export function libSitePageUrl(
  siteId: number,
  path: string,
  sites: LibSite[] = LIB_SITES,
  homes: Record<number, string> = readSiteMirrors(),
): string | null {
  const site = sites.find((item) => item.siteId === siteId);
  if (!site?.home) return null;

  return `${new URL(chosenMirror(site, homes)).origin}${path}`;
}

/** Страница тайтла на его сайте сети по Site-Id: манга — /ru/manga/, ранобэ — /ru/book/ */
export function libTitlePageUrl(
  siteId: number,
  slugUrl: string,
  sites: LibSite[] = LIB_SITES,
  homes: Record<number, string> = readSiteMirrors(),
): string | null {
  const site = sites.find((item) => item.siteId === siteId);
  if (!site?.home || !slugUrl) return null;

  const section = site.kind === 'ranobe' ? 'book' : 'manga';
  return libSitePageUrl(siteId, `/ru/${section}/${slugUrl}`, sites, homes);
}

/** С какой вкладки поиска начать */
export function pickSearchSite(
  counts: Record<number, number>,
  currentSiteId: number,
  sites: LibSite[] = LIB_SITES,
): number {
  if ((counts[currentSiteId] ?? 0) > 0) return currentSiteId;

  const found = sites.find((site) => (counts[site.siteId] ?? 0) > 0);
  return found?.siteId ?? currentSiteId;
}
