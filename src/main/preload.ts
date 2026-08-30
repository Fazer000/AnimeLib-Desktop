import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { UpdateInfo, UpdateResult } from '../constants/update';
import type {
  DownloadRequest,
  DownloadTask,
  OfflineDirectoryResult,
  OfflineSnapshot,
} from '../constants/offline';

import { createLogger } from '../shared/logger';

const log = createLogger('AnimeLIB');

export type Channels =
  | 'ipc-example'
  | 'player-button-clicked'
  | 'window-minimize'
  | 'window-maximize'
  | 'window-close'
  | 'window-fullscreen'
  | 'open-player-page'
  | 'webview-log'
  | 'setup-video-headers'
  | 'clear-video-headers'
  | 'get-maximize-state'
  | 'get-kodik-links'
  | 'fetch-subtitles'
  | 'fetch-image'
  | 'bookmarks-changed'
  | 'check-for-update'
  | 'download-update'
  | 'open-release-page'
  | 'update-download-progress'
  | 'offline-get-snapshot'
  | 'offline-enqueue'
  | 'offline-cancel-task'
  | 'offline-clear-finished'
  | 'offline-remove-episode'
  | 'offline-remove-anime'
  | 'offline-choose-directory'
  | 'offline-open-directory'
  | 'offline-check-connection'
  | 'offline-tasks-changed'
  | 'offline-library-changed'
  | 'offline-files-removed'
  | 'offline-file-missing'
  | 'offline-verify'
  | 'offline-resume'
  | 'offline-free-space'
  | 'offline-migration-progress';

/** Картинка, загруженная главным процессом с нужным Referer. */
export interface FetchImageResult {
  success: boolean;
  data?: string;
  contentType?: string;
  error?: string;
}

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
      log.debug('Preload: Sending player button click:', url);
      ipcRenderer.send('player-button-clicked', url);
    },
    setupVideoHeaders: async (siteUrl: string, authToken?: string) => {
      log.debug('Preload: Setting up video headers for:', siteUrl);
      return ipcRenderer.invoke('setup-video-headers', { siteUrl, authToken });
    },
    clearVideoHeaders: async () => {
      log.debug('Preload: Clearing video headers');
      return ipcRenderer.invoke('clear-video-headers');
    },
    setFullscreen: (isFullscreen: boolean) => {
      log.debug('Preload: Setting fullscreen:', isFullscreen);
      ipcRenderer.send('window-fullscreen', isFullscreen);
    },
    getMaximizeState: async (): Promise<boolean> => {
      log.debug('Preload: Getting maximize state');
      return ipcRenderer.invoke('get-maximize-state');
    },
    getKodikLinks: async (kodikSrc: string) => {
      log.debug('Preload: Getting Kodik links for:', kodikSrc);
      return ipcRenderer.invoke('get-kodik-links', kodikSrc);
    },
    fetchImage: async (payload: {
      url: string;
      referer: string;
    }): Promise<FetchImageResult> => ipcRenderer.invoke('fetch-image', payload),
    fetchSubtitles: async (
      urls: string[],
    ): Promise<{ success: boolean; data?: string; error?: string }> => {
      log.debug('Preload: Fetching subtitles');
      return ipcRenderer.invoke('fetch-subtitles', urls);
    },
    checkForUpdate: async (): Promise<UpdateInfo> => {
      log.debug('Preload: Checking for update');
      return ipcRenderer.invoke('check-for-update');
    },
    downloadUpdate: async (): Promise<UpdateResult> => {
      log.debug('Preload: Downloading update');
      return ipcRenderer.invoke('download-update');
    },
    openReleasePage: () => {
      log.debug('Preload: Opening release page');
      ipcRenderer.send('open-release-page');
    },
    offlineGetSnapshot: async (): Promise<OfflineSnapshot> =>
      ipcRenderer.invoke('offline-get-snapshot'),
    offlineEnqueue: async (
      requests: DownloadRequest[],
    ): Promise<DownloadTask[]> =>
      ipcRenderer.invoke('offline-enqueue', requests),
    offlineCancelTask: async (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('offline-cancel-task', taskId),
    offlineClearFinished: async (): Promise<boolean> =>
      ipcRenderer.invoke('offline-clear-finished'),
    offlineRemoveEpisode: async (payload: {
      animeId: string;
      episodeId: number;
      playerId: number;
      quality: string;
    }): Promise<boolean> =>
      ipcRenderer.invoke('offline-remove-episode', payload),
    offlineRemoveAnime: async (animeId: string): Promise<boolean> =>
      ipcRenderer.invoke('offline-remove-anime', animeId),
    offlineChooseDirectory: async (): Promise<OfflineDirectoryResult> =>
      ipcRenderer.invoke('offline-choose-directory'),
    offlineOpenDirectory: () => {
      ipcRenderer.send('offline-open-directory');
    },
    offlineCheckConnection: async (): Promise<boolean> =>
      ipcRenderer.invoke('offline-check-connection'),
    offlineVerify: async (): Promise<number> =>
      ipcRenderer.invoke('offline-verify'),
    offlineResume: async (payload: {
      authToken: string;
      taskId?: string;
    }): Promise<number> => ipcRenderer.invoke('offline-resume', payload),
    offlineGetFreeSpace: async (): Promise<number> =>
      ipcRenderer.invoke('offline-free-space'),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
