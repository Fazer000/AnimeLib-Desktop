/**
 * WebView Services
 * ООП-архитектура для управления webview
 */

export { WebViewManager } from './WebViewManager';
export type { NavigationState, WebViewCallbacks } from './WebViewManager';

export { ScriptInjectionManager } from './ScriptInjectionManager';
export type {
  InjectionCallback,
  ScriptInjectionConfig,
} from './ScriptInjectionManager';
