import { ElectronHandler } from '../main/preload';
import type { NavigationRecord } from './services/webview';
import type { AnimeLibDebugApi } from './utils/debugApi';

/** Отладочный API истории навигации, публикуемый в консоль. */
export interface AnimeLibNavApi {
  on: () => void;
  off: () => void;
  print: () => void;
  records: () => NavigationRecord[];
  clear: () => void;
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    animeLibNav?: AnimeLibNavApi;
    animeLibDebug?: AnimeLibDebugApi;
  }
}

export {};
