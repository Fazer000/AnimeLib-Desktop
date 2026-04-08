/**
 * Экспорт всех скриптов для WebView инъекций
 */

export { authExtractorScript, extractAuthToken } from './authExtractor';
export {
  clickInterceptorScript,
  injectClickInterceptor,
} from './clickInterceptor';
export { default as injectCustomSelect } from './customSelectInjector';
