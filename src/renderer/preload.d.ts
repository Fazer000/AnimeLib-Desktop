import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: {
      electronAPI: {
        setupVideoHeaders: (
          siteUrl: string,
          authToken?: string,
        ) => Promise<void>;
      };
    };
  }
}

export {};
