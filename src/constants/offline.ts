/**
 * Константы и типы оффлайн-библиотеки
 */

export const OFFLINE_SCHEME = 'animelib-offline';

export const OFFLINE_MEDIA_HOST = 'media';

export const OFFLINE_DIR_NAME = 'offline';

export const OFFLINE_INDEX_FILE = 'index.json';

export const OFFLINE_SETTINGS_FILE = 'offline-settings.json';

export const OFFLINE_MAX_PARALLEL_DOWNLOADS = 3;

export const OFFLINE_PROGRESS_THROTTLE_MS = 500;

export const OFFLINE_QUEUE_FILE = 'downloads.json';

export const OFFLINE_DOWNLOAD_RETRIES = 3;

export const OFFLINE_RETRY_DELAY_MS = 3000;

export const OFFLINE_MIN_FREE_SPACE_BYTES = 512 * 1024 * 1024;

/**
 * Ожидаемый размер серии по качеству, байт (используется до первой загрузки)
 */
export const OFFLINE_ESTIMATED_EPISODE_BYTES: Record<string, number> = {
  '360p': 90 * 1024 * 1024,
  '480p': 140 * 1024 * 1024,
  '720p': 210 * 1024 * 1024,
  '1080p': 420 * 1024 * 1024,
  '2160p': 1200 * 1024 * 1024,
};

export const OFFLINE_ESTIMATED_EPISODE_FALLBACK_BYTES = 250 * 1024 * 1024;

export const OFFLINE_HLS_SEGMENT_RETRIES = 3;

export const OFFLINE_HLS_STATE_SUFFIX = '.part.json';

export const OFFLINE_PARALLEL_CONNECTIONS = 8;

export const OFFLINE_PARALLEL_STATE_SUFFIX = '.parts.json';

export const OFFLINE_DOWNLOADABLE_PLAYER = 'Animelib';

export const OFFLINE_DOWNLOADABLE_PLAYERS = ['Animelib', 'Kodik'];

export const OFFLINE_PROGRESS_STORAGE_KEY = 'offlineWatchProgress';

export const OFFLINE_VIEWED_STORAGE_KEY = 'offlineWatchViewed';

export const CONNECTIVITY_CHECK_INTERVAL_MS = 30000;

export const CONNECTIVITY_CHECK_TIMEOUT_MS = 6000;

export const CONNECTIVITY_PROBE_URL =
  'https://api.cdnlibs.org/api/anime?limit=1';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * Статусы незавершённых задач очереди
 */
export const ACTIVE_DOWNLOAD_STATUSES: DownloadStatus[] = [
  'queued',
  'downloading',
  'paused',
];

/**
 * Проверяет, что задача ещё не завершена
 */
export const isActiveDownload = (status: DownloadStatus): boolean =>
  ACTIVE_DOWNLOAD_STATUSES.includes(status);

/**
 * Запрос на загрузку одной серии
 */
export interface DownloadRequest {
  animeId: string;
  animeTitle: string;
  coverUrl: string;
  animeRating: string;
  animeYear: number;
  animeTotalEpisodes: number;
  episodeId: number;
  episodeNumber: string;
  episodeName: string;
  season: string;
  playerId: number;
  playerType: string;
  teamId: number;
  teamName: string;
  translationTypeId: number;
  translationLabel: string;
  quality: string;
  sourceType: 'progressive' | 'hls';
  videoUrl: string;
  fallbackUrls: string[];
  subtitles: Array<{ name: string; format: string; src: string }>;
  timecode: unknown[];
  authToken: string;
  siteOrigin: string;
}

/**
 * Элемент очереди загрузки
 */
export interface DownloadTask {
  id: string;
  animeId: string;
  animeTitle: string;
  episodeId: number;
  episodeNumber: string;
  quality: string;
  teamName: string;
  status: DownloadStatus;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  error: string;
}

/**
 * Скачанная серия в каталоге
 */
export interface OfflineEpisode {
  episodeId: number;
  episodeNumber: string;
  episodeName: string;
  season: string;
  playerId: number;
  playerType: string;
  teamId: number;
  teamName: string;
  translationTypeId: number;
  translationLabel: string;
  quality: string;
  fileName: string;
  playlistFileName: string;
  fileSize: number;
  timecode: unknown[];
  subtitles: Array<{ name: string; format: string; fileName: string }>;
  createdAt: string;
}

/**
 * Метаданные аниме для оверлея плеера
 */
export interface OfflineAnimeMeta {
  title: string;
  coverUrl: string;
  rating: string;
  year: number;
  totalEpisodes: number;
}

/**
 * Аниме в каталоге
 */
export interface OfflineAnime {
  animeId: string;
  title: string;
  coverUrl: string;
  coverFileName: string;
  updatedAt: string;
  rating?: string;
  year?: number;
  totalEpisodes?: number;
  episodes: OfflineEpisode[];
}

/**
 * Локальная отметка прогресса просмотра
 */
export interface OfflineProgress {
  animeId: string;
  episodeId: number;
  itemNumber: string;
  seconds: number;
  teamId: number;
  translationTypeId: number;
  playerType: string;
  updatedAt: string;
  synced: boolean;
}

/**
 * Локальная отметка просмотра серии
 */
export interface OfflineViewed {
  animeId: string;
  episodeId: number;
  playerId: number;
  updatedAt: string;
  synced: boolean;
}

/**
 * Пункт списка «продолжить просмотр» из локального каталога
 */
export interface OfflineContinueItem {
  animeId: string;
  title: string;
  episodeId: number;
  episodeNumber: string;
  coverFileName: string;
}

/**
 * Итог смены директории загрузок
 */
export interface OfflineDirectoryResult {
  path: string;
  status: 'unchanged' | 'migrated' | 'busy' | 'no-space' | 'failed';
  moved: number;
  failed: number;
}

/**
 * Прогресс переноса библиотеки
 */
export interface OfflineMigrationProgress {
  moved: number;
  total: number;
}

/**
 * Полный снимок состояния оффлайн-библиотеки
 */
export interface OfflineSnapshot {
  anime: OfflineAnime[];
  tasks: DownloadTask[];
  downloadsPath: string;
}

/**
 * Строит ссылку на локальный файл для плеера
 */
export const buildOfflineUrl = (fileName: string): string =>
  `${OFFLINE_SCHEME}://${OFFLINE_MEDIA_HOST}/${fileName}`;

/**
 * Извлекает имя файла из ссылки протокола
 */
export const parseOfflineFileName = (url: string): string => {
  if (!url.startsWith(`${OFFLINE_SCHEME}://`)) {
    return '';
  }

  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
};

/**
 * Событие удаления файлов оффлайн-библиотеки
 */
export interface OfflineRemovalEvent {
  animeId: string;
  fileNames: string[];
}
