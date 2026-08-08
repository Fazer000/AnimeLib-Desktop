/* eslint-disable no-console */
/**
 * Хелперы для работы с URL сайта AnimeLib
 */

/**
 * Базовый URL сайта по умолчанию
 */
export const DEFAULT_SITE_URL = 'https://v5.animelib.org';

/**
 * Домены, которые считаются доменами сайта
 */
export const SITE_DOMAINS = ['animelib.org'];

/**
 * Проверяет, принадлежит ли URL домену сайта
 */
export function isSiteUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return SITE_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

/**
 * Приводит URL сайта к базовому виду (origin со слешем)
 */
export function normalizeSiteUrl(url: string): string {
  if (!isSiteUrl(url)) {
    return `${new URL(DEFAULT_SITE_URL).origin}/`;
  }

  return `${new URL(url).origin}/`;
}

/**
 * Возвращает origin сайта из localStorage
 */
export function getSiteOrigin(): string {
  const rawUrl = localStorage.getItem('animeLibUrl') || '';

  if (isSiteUrl(rawUrl)) {
    return new URL(rawUrl).origin;
  }

  return new URL(DEFAULT_SITE_URL).origin;
}

/**
 * Возвращает базовый URL сайта для кнопки «Домой»
 */
export function getHomeUrl(): string {
  return `${getSiteOrigin()}/`;
}

/**
 * Сохраняет базовый URL сайта; адреса сторонних доменов игнорируются
 */
export function saveSiteUrl(url: string): string {
  if (!isSiteUrl(url)) {
    console.warn('[urlHelpers] Ignored non-site URL as base:', url);
    return getHomeUrl();
  }

  const baseUrl = normalizeSiteUrl(url);

  try {
    localStorage.setItem('animeLibUrl', baseUrl);
  } catch (error) {
    console.error('[urlHelpers] Error saving site URL:', error);
  }

  return baseUrl;
}

/**
 * Возвращает URL главной страницы аниме по его slug
 */
export function buildAnimePageUrl(slugUrl: string): string {
  return `${getSiteOrigin()}/ru/anime/${slugUrl}`;
}

/**
 * Строит ссылку на комментарий к эпизоду
 */
export function buildCommentUrl(
  slugUrl: string,
  episodeId: number,
  commentId: number,
): string {
  return `${buildAnimePageUrl(slugUrl)}/watch?episode=${episodeId}&comment_id=${commentId}`;
}
