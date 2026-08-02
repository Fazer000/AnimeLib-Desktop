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

export { NavigationHistoryTracker } from './NavigationHistoryTracker';
export type {
  NavigationSource,
  NavigationRecord,
} from './NavigationHistoryTracker';

export {
  PlayerHistoryManager,
  playerHistoryManager,
} from './PlayerHistoryManager';
export type { PlayerHistoryEntry } from './PlayerHistoryManager';
