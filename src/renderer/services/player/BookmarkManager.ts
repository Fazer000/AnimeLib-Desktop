import { animeApi, Episode, AnimeBookmark } from '../../api/animeApi';

import { createLogger } from '../../../shared/logger';

const log = createLogger('BookmarkManager');

export interface BookmarkManagerConfig {
  onBookmarkLoaded?: (bookmark: AnimeBookmark) => void;
  onEpisodeFound?: (episodeIndex: number) => void;
  onTimecodeReady?: (timecode: string) => void;
}

/**
 * BookmarkManager - Управление закладками для аниме
 *
 * Responsibilities:
 * - Загрузка закладки с сервера
 * - Поиск эпизода по закладке
 * - Конвертация таймкода в секунды
 * - Управление состоянием закладки
 */
export class BookmarkManager {
  private config: BookmarkManagerConfig;

  private currentBookmark: AnimeBookmark | null = null;

  private bookmarkProcessed: boolean = false;

  private pendingTimecode: number | null = null;

  constructor(config: BookmarkManagerConfig = {}) {
    this.config = config;
  }

  /**
   * Загрузить закладку для аниме
   */
  public async loadBookmark(
    animeSlugUrl: string,
    episodes: Episode[],
  ): Promise<{
    episodeIndex: number | null;
    timecodeSeconds: number | null;
  }> {
    if (this.bookmarkProcessed) {
      log.debug('Bookmark already processed, skipping');
      return { episodeIndex: null, timecodeSeconds: null };
    }

    try {
      log.debug('Loading bookmark for:', animeSlugUrl);
      const response = await animeApi.getAnimeBookmark(animeSlugUrl);

      if (!response.data) {
        log.debug('No bookmark found');
        this.bookmarkProcessed = true;
        return { episodeIndex: null, timecodeSeconds: null };
      }

      const bookmark = response.data;
      this.currentBookmark = bookmark;

      log.debug('Bookmark loaded:', {
        episodeId: bookmark.item_id,
        progress: bookmark.progress,
      });

      if (this.config.onBookmarkLoaded) {
        this.config.onBookmarkLoaded(bookmark);
      }

      const episodeIndex = BookmarkManager.findEpisodeIndex(
        episodes,
        bookmark.item_id,
      );

      if (episodeIndex === -1) {
        log.debug('Episode not found in list');
        this.bookmarkProcessed = true;
        return { episodeIndex: null, timecodeSeconds: null };
      }

      log.debug(
        `Found episode at index ${episodeIndex}: ${episodes[episodeIndex].number}`,
      );

      const timecodeSeconds = BookmarkManager.timecodeToSecondsInternal(
        bookmark.progress,
      );
      this.pendingTimecode = timecodeSeconds;

      log.debug(`Timecode: ${bookmark.progress} = ${timecodeSeconds}s`);

      if (this.config.onEpisodeFound) {
        this.config.onEpisodeFound(episodeIndex);
      }

      if (this.config.onTimecodeReady) {
        this.config.onTimecodeReady(bookmark.progress);
      }

      this.bookmarkProcessed = true;

      return { episodeIndex, timecodeSeconds };
    } catch (error) {
      log.error('Error loading bookmark:', error);
      this.bookmarkProcessed = true;
      return { episodeIndex: null, timecodeSeconds: null };
    }
  }

  /**
   * Найти индекс эпизода по ID
   */
  private static findEpisodeIndex(
    episodes: Episode[],
    episodeId: number,
  ): number {
    return episodes.findIndex((ep) => ep.id === episodeId);
  }

  /**
   * Конвертировать таймкод (MM:SS или HH:MM:SS) в секунды
   */
  private static timecodeToSecondsInternal(timecode: string): number {
    try {
      const parts = timecode.split(':').map((p) => parseInt(p, 10));

      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }

      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }

      log.warn('Invalid timecode format:', timecode);
      return 0;
    } catch (error) {
      log.error('Error parsing timecode:', error);
      return 0;
    }
  }

  /**
   * Получить pending таймкод и очистить его
   */
  public consumePendingTimecode(): number | null {
    const timecode = this.pendingTimecode;
    this.pendingTimecode = null;
    return timecode;
  }

  /**
   * Проверить есть ли pending таймкод
   */
  public hasPendingTimecode(): boolean {
    return this.pendingTimecode !== null;
  }

  /**
   * Получить текущую закладку
   */
  public getCurrentBookmark(): AnimeBookmark | null {
    return this.currentBookmark;
  }

  /**
   * Проверить обработана ли закладка
   */
  public isProcessed(): boolean {
    return this.bookmarkProcessed;
  }

  /**
   * Сбросить состояние (для повторной загрузки)
   */
  public reset(): void {
    this.currentBookmark = null;
    this.bookmarkProcessed = false;
    this.pendingTimecode = null;
    log.debug('State reset');
  }

  /**
   * Статический метод для конвертации таймкода
   */
  public static timecodeToSeconds(timecode: string): number {
    try {
      const parts = timecode.split(':').map((p) => parseInt(p, 10));

      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }

      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Конвертировать секунды в таймкод (MM:SS или HH:MM:SS)
   */
  public static secondsToTimecode(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }

    return `${pad(minutes)}:${pad(secs)}`;
  }

  /**
   * Получить ID эпизода с закладкой
   */
  public getBookmarkedEpisodeId(): number | null {
    return this.currentBookmark ? this.currentBookmark.item_id : null;
  }

  /**
   * Сохранить закладку на сервер
   * Note: This is not static because it's used as instance method by components
   */
  // eslint-disable-next-line class-methods-use-this
  public async saveBookmark(
    animeSlugUrl: string,
    episodeId: number,
    currentTimeSeconds: number,
    meta: {
      team: number;
      translation_type: number;
      player: string;
      item_number: string;
    },
  ): Promise<boolean> {
    try {
      const timecode = BookmarkManager.secondsToTimecode(currentTimeSeconds);

      log.debug('Saving bookmark:', {
        anime: animeSlugUrl,
        episode: episodeId,
        timecode,
        seconds: currentTimeSeconds,
        meta,
      });

      await animeApi.saveAnimeBookmark(animeSlugUrl, episodeId, timecode, meta);

      log.debug('Bookmark saved successfully');
      return true;
    } catch (error) {
      log.error('Error saving bookmark:', error);
      return false;
    }
  }
}
