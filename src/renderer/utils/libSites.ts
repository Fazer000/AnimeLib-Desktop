import { LIB_SITES, LibSite } from '../../constants';

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
 * Главная сайта; у AnimeLib — адрес из настроек приложения
 */
export function libSiteHomeUrl(site: LibSite, animeHomeUrl: string): string {
  return site.home ?? animeHomeUrl;
}

/**
 * Куда ведёт «Домой»: на сайтах манги и ранобэ — на главную того домена,
 * где открыта страница; на AnimeLib и вне сети — на главную из настроек
 */
export function currentSiteHomeUrl(
  pageUrl: string,
  animeHomeUrl: string,
  sites: LibSite[] = LIB_SITES,
): string {
  const site = findLibSiteByUrl(pageUrl, sites);
  if (!site || site.kind === 'anime') return animeHomeUrl;

  return `${new URL(pageUrl).origin}/`;
}

/**
 * Страница тайтла на его сайте сети по Site-Id: манга — /ru/manga/,
 * ранобэ — /ru/book/. Аниме и неизвестный сайт — null: аниме открывается
 * своим путём, через адрес AnimeLib из настроек
 */
export function libTitlePageUrl(
  siteId: number,
  slugUrl: string,
  sites: LibSite[] = LIB_SITES,
): string | null {
  const site = sites.find((item) => item.siteId === siteId);
  if (!site?.home || !slugUrl) return null;

  const section = site.kind === 'ranobe' ? 'book' : 'manga';
  return `${new URL(site.home).origin}/ru/${section}/${slugUrl}`;
}
