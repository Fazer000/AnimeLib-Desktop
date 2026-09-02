/**
 * Контракт IPC: для каждого канала объявлены полезная нагрузка и ответ.
 * Обе стороны — preload и обработчики main — типизируются от него,
 * поэтому расхождение между вызовом и обработчиком ловится компилятором.
 */
import type {
  DownloadRequest,
  DownloadTask,
  OfflineDirectoryResult,
  OfflineMigrationProgress,
  OfflineRemovalEvent,
  OfflineSnapshot,
} from '../constants/offline';
import type { UpdateInfo, UpdateResult } from '../constants/update';
import type { ReportPayload } from '../constants/report';

/** Картинка, загруженная главным процессом с нужным Referer. */
export interface FetchImageResult {
  success: boolean;
  data?: string;
  contentType?: string;
  error?: string;
}

/** Текст файла субтитров либо причина отказа. */
export interface FetchSubtitlesResult {
  success: boolean;
  data?: string;
  error?: string;
}

/** Ссылки на видео Kodik, сгруппированные по качеству, либо причина отказа. */
export interface KodikLinksResult {
  success: boolean;
  data?: Record<string, Array<{ src: string; type: string }>>;
  error?: string;
}

export interface RendererErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
}

export interface RemoveEpisodePayload {
  animeId: string;
  episodeId: number;
  playerId: number;
  quality: string;
}

export interface ResumeDownloadsPayload {
  authToken: string;
  taskId?: string;
}

export interface VideoHeadersPayload {
  siteUrl: string;
  authToken?: string;
}

export interface FetchImagePayload {
  url: string;
  referer: string;
}

/** Каналы «запрос — ответ», вызываются через invoke. */
export interface IpcInvokeMap {
  'get-maximize-state': { request: void; response: boolean };
  'fetch-image': { request: FetchImagePayload; response: FetchImageResult };
  'fetch-subtitles': { request: string[]; response: FetchSubtitlesResult };
  'get-kodik-links': { request: string; response: KodikLinksResult };
  'setup-video-headers': {
    request: VideoHeadersPayload;
    response: { success: boolean };
  };
  'clear-video-headers': { request: void; response: { success: boolean } };
  'check-for-update': { request: void; response: UpdateInfo };
  'download-update': { request: void; response: UpdateResult };
  'offline-get-snapshot': { request: void; response: OfflineSnapshot };
  'offline-enqueue': { request: DownloadRequest[]; response: DownloadTask[] };
  'offline-cancel-task': { request: string; response: boolean };
  'offline-cancel-all': { request: void; response: number };
  'offline-clear-finished': { request: void; response: boolean };
  'offline-remove-episode': {
    request: RemoveEpisodePayload;
    response: boolean;
  };
  'offline-remove-anime': { request: string; response: boolean };
  'offline-choose-directory': {
    request: void;
    response: OfflineDirectoryResult;
  };
  'offline-check-connection': { request: void; response: boolean };
  'offline-verify': { request: void; response: number };
  'offline-resume': { request: ResumeDownloadsPayload; response: number };
  'offline-free-space': { request: void; response: number };
}

/** Каналы без ответа, из renderer в main. */
export interface IpcSendMap {
  'window-minimize': void;
  'window-maximize': void;
  'window-close': void;
  'window-fullscreen': boolean;
  'player-button-clicked': string;
  'webview-log': string;
  'open-release-page': void;
  'open-issue-page': ReportPayload;
  'offline-open-directory': void;
  'report-renderer-error': RendererErrorReport;
  'debug-crash-main': void;
  'debug-crash-renderer': void;
}

/** Каналы уведомлений из main в renderer. */
export interface IpcEventMap {
  'open-player-page': [url: string];
  'bookmarks-changed': [];
  'update-download-progress': [percent: number];
  'offline-tasks-changed': [];
  'offline-library-changed': [];
  'offline-files-removed': [event: OfflineRemovalEvent];
  'offline-file-missing': [fileName: string];
  'offline-migration-progress': [progress: OfflineMigrationProgress];
}

export type IpcInvokeChannel = keyof IpcInvokeMap;
export type IpcSendChannel = keyof IpcSendMap;
export type IpcEventChannel = keyof IpcEventMap;

export type IpcRequest<C extends IpcInvokeChannel> = IpcInvokeMap[C]['request'];
export type IpcResponse<C extends IpcInvokeChannel> =
  IpcInvokeMap[C]['response'];
