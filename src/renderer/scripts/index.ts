/**
 * Экспорт всех скриптов для WebView инъекций
 */

export { authExtractorScript, extractAuthToken } from './authExtractor';
export type { AuthExtractionOutcome } from './authExtractor';
export {
  clickInterceptorScript,
  injectClickInterceptor,
} from './clickInterceptor';
export {
  customSelectInjectorMain,
  getCustomSelectScript,
} from './customSelectInjector';
export {
  installPageScrollWatcher,
  parsePageScrollMessage,
  scrollPageToTop,
} from './pageScrollWatcher';
export type { PageScrollState } from './pageScrollWatcher';
export {
  SITE_THEME_MARKER,
  installSiteThemeWatcher,
  parseSiteThemeMessage,
  readSiteTheme,
  writeSiteTheme,
  isReaderUrl,
  readerThemeFor,
  writeReaderTheme,
} from './siteThemeExtractor';
