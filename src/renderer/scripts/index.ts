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
