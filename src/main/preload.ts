import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'player-button-clicked'
  | 'window-minimize'
  | 'window-maximize'
  | 'window-close'
  | 'open-player-page'
  | 'webview-log'
  | 'setup-video-headers'
  | 'clear-video-headers';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: Channels, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  electronAPI: {
    onPlayerButtonClicked: (url: string) => {
      console.log('[AnimeLIB] Preload: Sending player button click:', url);
      ipcRenderer.send('player-button-clicked', url);
    },
    setupVideoHeaders: async (siteUrl: string, authToken?: string) => {
      console.log('[AnimeLIB] Preload: Setting up video headers for:', siteUrl);
      return ipcRenderer.invoke('setup-video-headers', { siteUrl, authToken });
    },
    clearVideoHeaders: async () => {
      console.log('[AnimeLIB] Preload: Clearing video headers');
      return ipcRenderer.invoke('clear-video-headers');
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
