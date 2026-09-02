import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  DownloadRequest,
  DownloadTask,
  OfflineDirectoryResult,
  OfflineSnapshot,
  ReportPayload,
  UpdateInfo,
  UpdateResult,
} from '../constants';

import { createLogger } from '../shared/logger';
import type {
  FetchImagePayload,
  FetchImageResult,
  FetchSubtitlesResult,
  IpcEventChannel,
  IpcEventMap,
  IpcInvokeChannel,
  IpcRequest,
  IpcResponse,
  IpcSendChannel,
  IpcSendMap,
  KodikLinksResult,
  RemoveEpisodePayload,
  RendererErrorReport,
  ResumeDownloadsPayload,
} from '../shared/ipc';

const log = createLogger('AnimeLIB');

const electronHandler = {
  ipcRenderer: {
    sendMessage<C extends IpcSendChannel>(
      channel: C,
      ...args: IpcSendMap[C] extends void ? [] : [payload: IpcSendMap[C]]
    ) {
      ipcRenderer.send(channel, ...args);
    },
    on<C extends IpcEventChannel>(
      channel: C,
      func: (...args: IpcEventMap[C]) => void,
    ) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...(args as IpcEventMap[C]));
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once<C extends IpcEventChannel>(
      channel: C,
      func: (...args: IpcEventMap[C]) => void,
    ) {
      ipcRenderer.once(channel, (_event, ...args) =>
        func(...(args as IpcEventMap[C])),
      );
    },
    invoke<C extends IpcInvokeChannel>(
      channel: C,
      ...args: IpcRequest<C> extends void ? [] : [payload: IpcRequest<C>]
    ): Promise<IpcResponse<C>> {
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
    getKodikLinks: async (kodikSrc: string): Promise<KodikLinksResult> => {
      log.debug('Preload: Getting Kodik links for:', kodikSrc);
      return ipcRenderer.invoke('get-kodik-links', kodikSrc);
    },
    reportRendererError: (payload: RendererErrorReport) => {
      ipcRenderer.send('report-renderer-error', payload);
    },
    fetchImage: async (payload: FetchImagePayload): Promise<FetchImageResult> =>
      ipcRenderer.invoke('fetch-image', payload),
    fetchSubtitles: async (urls: string[]): Promise<FetchSubtitlesResult> => {
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
    openIssuePage: (payload: ReportPayload) => {
      log.debug('Preload: Opening issue form');
      ipcRenderer.send('open-issue-page', payload);
    },
    offlineGetSnapshot: async (): Promise<OfflineSnapshot> =>
      ipcRenderer.invoke('offline-get-snapshot'),
    offlineEnqueue: async (
      requests: DownloadRequest[],
    ): Promise<DownloadTask[]> =>
      ipcRenderer.invoke('offline-enqueue', requests),
    offlineCancelTask: async (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('offline-cancel-task', taskId),
    offlineCancelAll: async (): Promise<number> =>
      ipcRenderer.invoke('offline-cancel-all'),
    offlineClearFinished: async (): Promise<boolean> =>
      ipcRenderer.invoke('offline-clear-finished'),
    offlineRemoveEpisode: async (
      payload: RemoveEpisodePayload,
    ): Promise<boolean> =>
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
    offlineResume: async (payload: ResumeDownloadsPayload): Promise<number> =>
      ipcRenderer.invoke('offline-resume', payload),
    offlineGetFreeSpace: async (): Promise<number> =>
      ipcRenderer.invoke('offline-free-space'),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
