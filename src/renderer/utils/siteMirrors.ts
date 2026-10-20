import {
  LIB_SITE_MIRRORS_STORAGE_KEY,
  LIB_SITES,
  LIB_START_SITE_STORAGE_KEY,
  LibSite,
} from '../../constants';
import { getHomeUrl, saveSiteUrl } from './urlHelpers';
import { createLogger } from '../../shared/logger';

const log = createLogger('siteMirrors');

export type MirrorStatus = 'checking' | 'ok' | 'fail';

export interface MirrorState {
  status: MirrorStatus;
  ms?: number;
}

export type MirrorStates = Record<string, MirrorState>;

/**
 * Выбранные зеркала сайтов, кроме AnimeLib: { [siteId]: главная }
 */
export function readSiteMirrors(): Record<number, string> {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(LIB_SITE_MIRRORS_STORAGE_KEY) || '{}',
    );
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Главная сайта с учётом выбранного зеркала; выбор не из списка
 * зеркал сайта игнорируется
 */
export function chosenMirror(
  site: LibSite,
  homes: Record<number, string>,
): string {
  const chosen = homes[site.siteId];
  if (chosen && site.mirrors.includes(chosen)) return chosen;

  return site.home ?? site.mirrors[0];
}

/**
 * Текущее зеркало сайта: у AnimeLib — адрес из настроек приложения
 */
export function currentMirror(site: LibSite): string {
  return site.kind === 'anime'
    ? getHomeUrl()
    : chosenMirror(site, readSiteMirrors());
}

/**
 * Запоминает зеркало сайта; у AnimeLib это адрес сайта в настройках
 */
export function saveSiteMirror(site: LibSite, home: string): void {
  if (site.kind === 'anime') {
    saveSiteUrl(home);
    return;
  }

  try {
    localStorage.setItem(
      LIB_SITE_MIRRORS_STORAGE_KEY,
      JSON.stringify({ ...readSiteMirrors(), [site.siteId]: home }),
    );
  } catch (error) {
    log.error('Error saving site mirror:', error);
  }
}

/**
 * Какое зеркало предложить: выбранное, пока оно не признано недоступным,
 * иначе первое доступное, затем первое ещё проверяемое
 */
export function pickMirror(
  mirrors: string[],
  states: MirrorStates,
  preferred: string | null = null,
): string {
  const status = (url: string) => states[url]?.status ?? 'checking';

  if (preferred && mirrors.includes(preferred) && status(preferred) !== 'fail')
    return preferred;

  return (
    mirrors.find((url) => status(url) === 'ok') ??
    mirrors.find((url) => status(url) === 'checking') ??
    preferred ??
    mirrors[0]
  );
}

/**
 * Состояние сайта по его зеркалам: доступен, если отвечает хоть одно
 */
export function siteStatus(
  mirrors: string[],
  states: MirrorStates,
): MirrorStatus {
  const list = mirrors.map((url) => states[url]?.status ?? 'checking');
  if (list.includes('ok')) return 'ok';
  if (list.includes('checking')) return 'checking';
  return 'fail';
}

/**
 * Время ответа для подписи: 640 → «0,6 с»
 */
export function formatLatency(ms: number): string {
  return `${(Math.max(ms, 100) / 1000).toFixed(1).replace('.', ',')} с`;
}

/**
 * Хост зеркала для подписи: https://v5.animelib.org/ → v5.animelib.org
 */
export function mirrorHost(home: string): string {
  try {
    return new URL(home).hostname;
  } catch {
    return home;
  }
}

/**
 * Базовый сайт, с которого открывается приложение; не выбран — null
 */
export function readStartSite(sites: LibSite[] = LIB_SITES): LibSite | null {
  try {
    const siteId = Number(localStorage.getItem(LIB_START_SITE_STORAGE_KEY));
    return sites.find((site) => site.siteId === siteId) ?? null;
  } catch {
    return null;
  }
}

/**
 * Запоминает базовый сайт
 */
export function saveStartSite(site: LibSite): void {
  try {
    localStorage.setItem(LIB_START_SITE_STORAGE_KEY, String(site.siteId));
  } catch (error) {
    log.error('Error saving start site:', error);
  }
}
