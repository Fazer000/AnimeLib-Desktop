/* eslint-disable no-console */

/**
 * Каталог скачанных серий и настройки директории загрузок
 */
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import {
  OFFLINE_DIR_NAME,
  OFFLINE_INDEX_FILE,
  OFFLINE_MIN_FREE_SPACE_BYTES,
  OFFLINE_QUEUE_FILE,
  OFFLINE_SETTINGS_FILE,
  OfflineAnime,
  OfflineAnimeMeta,
  OfflineEpisode,
} from '../../constants';

interface OfflineSettings {
  downloadsPath: string;
}

const OFFLINE_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+(\.part\.json)?$/i;

class OfflineLibrary {
  private anime: OfflineAnime[] = [];

  private downloadsPath: string = '';

  /**
   * Загружает настройки и каталог с диска
   */
  public init(): void {
    this.downloadsPath = OfflineLibrary.readSettings().downloadsPath;
    fs.mkdirSync(this.downloadsPath, { recursive: true });
    this.readIndex();
    console.log('[OfflineLibrary] Path:', this.downloadsPath);
  }

  /**
   * Проверяет наличие файла в директории загрузок
   */
  public hasFile(fileName: string): boolean {
    if (!fileName) {
      return false;
    }

    try {
      return fs.statSync(this.resolveFile(fileName)).size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Вычищает записи, файлы которых пропали с диска
   */
  public verify(): number {
    if (!fs.existsSync(this.downloadsPath)) {
      console.warn('[OfflineLibrary] Path unavailable, verify skipped');
      return 0;
    }

    let removed = 0;

    this.anime.forEach((entry) => {
      const alive = entry.episodes.filter((episode) =>
        this.hasFile(episode.fileName),
      );

      removed += entry.episodes.length - alive.length;
      entry.episodes = alive;

      if (entry.coverFileName && !this.hasFile(entry.coverFileName)) {
        entry.coverFileName = '';
      }

      entry.episodes.forEach((episode) => {
        // eslint-disable-next-line no-param-reassign
        episode.subtitles = episode.subtitles.filter((subtitle) =>
          this.hasFile(subtitle.fileName),
        );
      });

      entry.episodes = entry.episodes.filter(
        (episode) =>
          !episode.playlistFileName || this.hasFile(episode.playlistFileName),
      );
    });

    const before = this.anime.length;
    this.anime = this.anime.filter((entry) => entry.episodes.length > 0);

    if (removed > 0 || this.anime.length !== before) {
      this.writeIndex();
      console.warn('[OfflineLibrary] Missing episodes removed:', removed);
    }

    return removed;
  }

  /**
   * Удаляет файлы приложения, которых нет в каталоге
   */
  public cleanupOrphans(reserved: string[] = []): number {
    if (!fs.existsSync(this.downloadsPath)) {
      return 0;
    }

    const known = new Set<string>(reserved);

    this.anime.forEach((entry) => {
      if (entry.coverFileName) {
        known.add(entry.coverFileName);
      }

      entry.episodes.forEach((episode) => {
        known.add(episode.fileName);

        if (episode.playlistFileName) {
          known.add(episode.playlistFileName);
        }

        episode.subtitles.forEach((subtitle) => known.add(subtitle.fileName));
      });
    });

    let removed = 0;

    fs.readdirSync(this.downloadsPath).forEach((name) => {
      if (!OFFLINE_FILE_PATTERN.test(name) || known.has(name)) {
        return;
      }

      try {
        fs.rmSync(path.join(this.downloadsPath, name), { force: true });
        removed += 1;
      } catch (error) {
        console.error('[OfflineLibrary] Failed to remove orphan:', error);
      }
    });

    if (removed > 0) {
      console.warn('[OfflineLibrary] Orphan files removed:', removed);
    }

    return removed;
  }

  /**
   * Возвращает путь к файлу настроек
   */
  private static getSettingsFile(): string {
    return path.join(app.getPath('userData'), OFFLINE_SETTINGS_FILE);
  }

  /**
   * Читает настройки с диска
   */
  private static readSettings(): OfflineSettings {
    const defaultPath = path.join(app.getPath('userData'), OFFLINE_DIR_NAME);

    try {
      const raw = fs.readFileSync(OfflineLibrary.getSettingsFile(), 'utf8');
      const parsed = JSON.parse(raw);
      return { downloadsPath: parsed.downloadsPath || defaultPath };
    } catch {
      return { downloadsPath: defaultPath };
    }
  }

  /**
   * Возвращает текущую директорию загрузок
   */
  public getDownloadsPath(): string {
    return this.downloadsPath;
  }

  /**
   * Меняет директорию загрузок
   */
  public setDownloadsPath(newPath: string): void {
    this.downloadsPath = newPath;
    fs.mkdirSync(newPath, { recursive: true });
    OfflineLibrary.writeSettings(newPath);
    this.readIndex();
    console.log('[OfflineLibrary] Path changed:', newPath);
  }

  /**
   * Пишет настройки на диск
   */
  private static writeSettings(newPath: string): void {
    fs.writeFileSync(
      OfflineLibrary.getSettingsFile(),
      JSON.stringify({ downloadsPath: newPath }, null, 2),
      'utf8',
    );
  }

  /**
   * Собирает существующие на диске файлы каталога
   */
  private collectFiles(): string[] {
    const names = new Set<string>();

    this.anime.forEach((entry) => {
      if (entry.coverFileName) {
        names.add(entry.coverFileName);
      }

      entry.episodes.forEach((episode) => {
        names.add(episode.fileName);
        episode.subtitles.forEach((subtitle) => names.add(subtitle.fileName));
      });
    });

    return Array.from(names).filter((name) => this.hasFile(name));
  }

  /**
   * Проверяет, поместится ли библиотека в целевую директорию
   */
  private canFit(newPath: string, files: string[]): boolean {
    try {
      if (fs.statSync(this.downloadsPath).dev === fs.statSync(newPath).dev) {
        return true;
      }

      const needed = files.reduce(
        (sum, name) => sum + fs.statSync(this.resolveFile(name)).size,
        0,
      );
      const stats = fs.statfsSync(newPath);

      return stats.bavail * stats.bsize > needed + OFFLINE_MIN_FREE_SPACE_BYTES;
    } catch {
      return true;
    }
  }

  /**
   * Переносит один файл между директориями
   */
  private static async moveFile(from: string, to: string): Promise<void> {
    try {
      await fs.promises.rename(from, to);
    } catch (error: any) {
      if (error?.code !== 'EXDEV') {
        throw error;
      }

      await fs.promises.copyFile(from, to);
      await fs.promises.rm(from, { force: true });
    }
  }

  /**
   * Переносит библиотеку в новую директорию
   */
  public async migrateTo(
    newPath: string,
    onProgress?: (moved: number, total: number) => void,
  ): Promise<{ moved: number; failed: number; fits: boolean }> {
    const files = this.collectFiles();

    fs.mkdirSync(newPath, { recursive: true });

    const existing = OfflineLibrary.readIndexAt(newPath);

    if (!this.canFit(newPath, files)) {
      console.error('[OfflineLibrary] Not enough space at:', newPath);
      return { moved: 0, failed: 0, fits: false };
    }

    let moved = 0;
    let failed = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const name of [...files, OFFLINE_QUEUE_FILE]) {
      if (this.hasFile(name)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await OfflineLibrary.moveFile(
            this.resolveFile(name),
            path.join(newPath, name),
          );
          moved += 1;
        } catch (error) {
          failed += 1;
          console.error('[OfflineLibrary] Move failed:', name, error);
        }
      }

      onProgress?.(moved + failed, files.length);
    }

    try {
      fs.rmSync(this.getIndexFile(), { force: true });
    } catch (error) {
      console.error('[OfflineLibrary] Failed to remove old index:', error);
    }

    this.downloadsPath = newPath;
    OfflineLibrary.writeSettings(newPath);

    const adopted = this.mergeAnime(existing);

    if (adopted > 0) {
      console.log('[OfflineLibrary] Adopted episodes from target:', adopted);
    }

    this.writeIndex();
    this.verify();

    console.log('[OfflineLibrary] Migrated:', moved, 'failed:', failed);

    return { moved, failed, fits: true };
  }

  /**
   * Возвращает путь к файлу каталога
   */
  private getIndexFile(): string {
    return path.join(this.downloadsPath, OFFLINE_INDEX_FILE);
  }

  /**
   * Читает каталог с диска
   */
  /**
   * Читает каталог из произвольной директории
   */
  private static readIndexAt(dir: string): OfflineAnime[] {
    try {
      const raw = fs.readFileSync(path.join(dir, OFFLINE_INDEX_FILE), 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.anime) ? parsed.anime : [];
    } catch {
      return [];
    }
  }

  /**
   * Добавляет в каталог записи, которых в нём ещё нет
   */
  private mergeAnime(incoming: OfflineAnime[]): number {
    let added = 0;

    incoming.forEach((entry) => {
      const target = this.anime.find((item) => item.animeId === entry.animeId);

      if (!target) {
        this.anime.push(entry);
        added += entry.episodes.length;
        return;
      }

      target.coverFileName = target.coverFileName || entry.coverFileName;

      entry.episodes.forEach((episode) => {
        const exists = target.episodes.some(
          (item) =>
            item.episodeId === episode.episodeId &&
            item.playerId === episode.playerId &&
            item.quality === episode.quality,
        );

        if (!exists) {
          target.episodes.push(episode);
          added += 1;
        }
      });

      target.episodes.sort(
        (a, b) => parseFloat(a.episodeNumber) - parseFloat(b.episodeNumber),
      );
    });

    return added;
  }

  private readIndex(): void {
    try {
      const raw = fs.readFileSync(this.getIndexFile(), 'utf8');
      const parsed = JSON.parse(raw);
      this.anime = Array.isArray(parsed?.anime) ? parsed.anime : [];
    } catch {
      this.anime = [];
    }
  }

  /**
   * Пишет каталог на диск
   */
  private writeIndex(): void {
    try {
      fs.writeFileSync(
        this.getIndexFile(),
        JSON.stringify({ anime: this.anime }, null, 2),
        'utf8',
      );
    } catch (error) {
      console.error('[OfflineLibrary] Failed to write index:', error);
    }
  }

  /**
   * Возвращает весь каталог
   */
  public getAnime(): OfflineAnime[] {
    return this.anime;
  }

  /**
   * Абсолютный путь к файлу внутри директории загрузок
   */
  public resolveFile(fileName: string): string {
    const safeName = path.basename(fileName);
    return path.join(this.downloadsPath, safeName);
  }

  /**
   * Проверяет наличие скачанной серии в нужном качестве
   */
  public hasEpisode(
    episodeId: number,
    playerId: number,
    quality: string,
  ): boolean {
    return this.anime.some((item) =>
      item.episodes.some(
        (episode) =>
          episode.episodeId === episodeId &&
          episode.playerId === playerId &&
          episode.quality === quality,
      ),
    );
  }

  /**
   * Добавляет или заменяет запись о серии
   */
  public addEpisode(
    animeId: string,
    meta: OfflineAnimeMeta,
    episode: OfflineEpisode,
    coverFileName: string = '',
  ): void {
    let entry = this.anime.find((item) => item.animeId === animeId);

    if (!entry) {
      entry = {
        animeId,
        title: meta.title,
        coverUrl: meta.coverUrl,
        coverFileName: '',
        updatedAt: '',
        episodes: [],
      };
      this.anime.push(entry);
    }

    entry.title = meta.title || entry.title;
    entry.coverUrl = meta.coverUrl || entry.coverUrl;
    entry.rating = meta.rating || entry.rating;
    entry.year = meta.year || entry.year;
    entry.totalEpisodes = meta.totalEpisodes || entry.totalEpisodes;
    entry.coverFileName = coverFileName || entry.coverFileName;
    entry.updatedAt = new Date().toISOString();
    entry.episodes = entry.episodes.filter(
      (item) =>
        !(
          item.episodeId === episode.episodeId &&
          item.playerId === episode.playerId &&
          item.quality === episode.quality
        ),
    );
    entry.episodes.push(episode);
    entry.episodes.sort(
      (a, b) => parseFloat(a.episodeNumber) - parseFloat(b.episodeNumber),
    );

    this.writeIndex();
  }

  /**
   * Удаляет серию вместе с файлами и возвращает имена удалённых файлов
   */
  public removeEpisode(
    animeId: string,
    episodeId: number,
    playerId: number,
    quality: string,
  ): string[] {
    const entry = this.anime.find((item) => item.animeId === animeId);

    if (!entry) {
      return [];
    }

    const target = entry.episodes.find(
      (item) =>
        item.episodeId === episodeId &&
        item.playerId === playerId &&
        item.quality === quality,
    );

    const removed: string[] = [];

    if (target) {
      [
        target.fileName,
        target.playlistFileName,
        ...target.subtitles.map((s) => s.fileName),
      ]
        .filter(Boolean)
        .forEach((fileName) => {
          try {
            fs.rmSync(this.resolveFile(fileName), { force: true });
            removed.push(fileName);
          } catch (error) {
            console.error('[OfflineLibrary] Failed to remove file:', error);
          }
        });
    }

    entry.episodes = entry.episodes.filter((item) => item !== target);

    if (entry.episodes.length === 0) {
      this.anime = this.anime.filter((item) => item !== entry);
    }

    this.writeIndex();

    return removed;
  }

  /**
   * Удаляет аниме целиком и возвращает имена удалённых файлов
   */
  public removeAnime(animeId: string): string[] {
    const entry = this.anime.find((item) => item.animeId === animeId);

    if (!entry) {
      return [];
    }

    const removed: string[] = [];

    if (entry.coverFileName) {
      try {
        fs.rmSync(this.resolveFile(entry.coverFileName), { force: true });
        removed.push(entry.coverFileName);
      } catch (error) {
        console.error('[OfflineLibrary] Failed to remove cover:', error);
      }
    }

    [...entry.episodes].forEach((episode) => {
      removed.push(
        ...this.removeEpisode(
          animeId,
          episode.episodeId,
          episode.playerId,
          episode.quality,
        ),
      );
    });

    return removed;
  }

  /**
   * Возвращает имя файла обложки аниме
   */
  public getCoverFileName(animeId: string): string {
    return (
      this.anime.find((item) => item.animeId === animeId)?.coverFileName || ''
    );
  }
}

// eslint-disable-next-line import/prefer-default-export
export const offlineLibrary = new OfflineLibrary();
