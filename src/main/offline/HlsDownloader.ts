/**
 * Загрузка HLS: склейка сегментов и генерация локального плейлиста
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import {
  OFFLINE_HLS_SEGMENT_RETRIES,
  OFFLINE_HLS_STATE_SUFFIX,
  OFFLINE_MIN_FREE_SPACE_BYTES,
} from '../../constants';
import { httpGet, toAbsoluteUrl } from './httpClient';

import { createLogger } from '../../shared/logger';

const log = createLogger('HlsDownloader');

export interface Segment {
  url: string;
  duration: number;
  discontinuity: boolean;
  rangeHeader: string;
}

export interface PlaylistInfo {
  segments: Segment[];
  initUrl: string;
  initRangeHeader: string;
  encrypted: boolean;
}

interface SegmentState {
  bytes: number;
  duration: number;
  discontinuity?: boolean;
  init?: boolean;
}

export interface HlsDownloadParams {
  url: string;
  headers: Record<string, string>;
  mediaPath: string;
  playlistPath: string;
  mediaFileName: string;
  isCancelled: () => boolean;
  onProgress: (loaded: number, percent: number) => void;
}

export interface HlsDownloadResult {
  outcome: 'completed' | 'failed' | 'no-space' | 'cancelled';
  bytes: number;
}

const TS_PACKET_SIZE = 188;

const TS_SYNC_BYTE = 0x47;

/**
 * Преобразует спецификацию BYTERANGE в заголовок Range
 */
const toRange = (
  spec: string,
  lastEnd: number,
): { header: string; end: number; length: number } => {
  const [rawLength, rawOffset] = spec.split('@');
  const length = parseInt(rawLength, 10);

  if (!spec || !length) {
    return { header: '', end: lastEnd, length: 0 };
  }

  const offset = rawOffset ? parseInt(rawOffset, 10) : lastEnd;

  return {
    header: `bytes=${offset}-${offset + length - 1}`,
    end: offset + length,
    length,
  };
};

/**
 * Разбирает плейлист на сегменты, инициализацию и признак шифрования
 */
export const parsePlaylist = (text: string, baseUrl: string): PlaylistInfo => {
  const lines = text.split('\n').map((line) => line.trim());
  const segments: Segment[] = [];

  let duration = 0;
  let discontinuity = false;
  let pendingRange = '';
  let lastEnd = 0;
  let initUrl = '';
  let initRangeHeader = '';
  let encrypted = false;

  lines.forEach((line) => {
    if (line.startsWith('#EXTINF')) {
      duration = parseFloat(line.split(':')[1]) || 0;
      return;
    }

    if (line.startsWith('#EXT-X-DISCONTINUITY')) {
      discontinuity = true;
      return;
    }

    if (line.startsWith('#EXT-X-KEY')) {
      encrypted = !line.includes('METHOD=NONE');
      return;
    }

    if (line.startsWith('#EXT-X-BYTERANGE')) {
      pendingRange = line.slice(line.indexOf(':') + 1);
      return;
    }

    if (line.startsWith('#EXT-X-MAP')) {
      const uri = /URI="([^"]+)"/.exec(line)?.[1] || '';
      const range = /BYTERANGE="([^"]+)"/.exec(line)?.[1] || '';

      initUrl = uri ? toAbsoluteUrl(uri, baseUrl) : '';
      initRangeHeader = toRange(range, 0).header;
      return;
    }

    if (!line || line.startsWith('#')) {
      return;
    }

    const range = toRange(pendingRange, lastEnd);
    lastEnd = range.end;

    segments.push({
      url: toAbsoluteUrl(line, baseUrl),
      duration,
      discontinuity,
      rangeHeader: range.header,
    });

    duration = 0;
    discontinuity = false;
    pendingRange = '';
  });

  return { segments, initUrl, initRangeHeader, encrypted };
};

/**
 * Выбирает вариант максимального качества из мастер-плейлиста
 */
const pickVariant = (text: string, baseUrl: string): string => {
  const lines = text.split('\n').map((line) => line.trim());
  let best = { bandwidth: -1, url: '' };

  lines.forEach((line, index) => {
    if (!line.startsWith('#EXT-X-STREAM-INF')) {
      return;
    }

    const match = /BANDWIDTH=(\d+)/.exec(line);
    const bandwidth = match ? parseInt(match[1], 10) : 0;
    const uri = lines[index + 1];

    if (uri && !uri.startsWith('#') && bandwidth > best.bandwidth) {
      best = { bandwidth, url: toAbsoluteUrl(uri, baseUrl) };
    }
  });

  return best.url;
};

/** Пишет чанк, дожидаясь разгрузки буфера при обратном давлении. */
const writeChunk = (stream: fs.WriteStream, chunk: Buffer): Promise<void> =>
  new Promise((resolve) => {
    if (stream.write(chunk)) {
      resolve();
      return;
    }
    stream.once('drain', resolve);
  });

/** Закрывает поток, дожидаясь сброса буфера на диск. */
const closeStream = (stream: fs.WriteStream): Promise<void> =>
  new Promise((resolve) => {
    stream.end(() => resolve());
  });

class HlsDownloader {
  /**
   * Возвращает путь к файлу состояния докачки
   */
  // eslint-disable-next-line class-methods-use-this
  private statePath(mediaPath: string): string {
    return `${mediaPath}${OFFLINE_HLS_STATE_SUFFIX}`;
  }

  /**
   * Читает состояние докачки, согласованное с файлом на диске
   */
  private readState(mediaPath: string, url: string): SegmentState[] {
    try {
      const raw = fs.readFileSync(this.statePath(mediaPath), 'utf8');
      const parsed = JSON.parse(raw);

      if (parsed?.url !== url || !Array.isArray(parsed?.segments)) {
        return [];
      }

      const written = parsed.segments.reduce(
        (sum: number, item: SegmentState) => sum + item.bytes,
        0,
      );

      if (fs.statSync(mediaPath).size !== written) {
        log.warn('State mismatch, restarting');
        return [];
      }

      return parsed.segments;
    } catch {
      return [];
    }
  }

  /**
   * Пишет состояние докачки
   */
  private async writeState(
    mediaPath: string,
    url: string,
    segments: SegmentState[],
  ): Promise<void> {
    try {
      await fsp.writeFile(
        this.statePath(mediaPath),
        JSON.stringify({ url, segments }),
        'utf8',
      );
    } catch (error) {
      log.error('Failed to write state:', error);
    }
  }

  /**
   * Проверяет свободное место под остаток загрузки
   */
  private static hasFreeSpace(target: string, needed: number): boolean {
    try {
      const stats = fs.statfsSync(path.dirname(target));
      return stats.bavail * stats.bsize > needed + OFFLINE_MIN_FREE_SPACE_BYTES;
    } catch {
      return true;
    }
  }

  /**
   * Отбраковывает заглушки и повреждённые чанки
   */
  private static isMediaChunk(chunk: Buffer): boolean {
    if (chunk.length === 0) {
      return false;
    }

    const head = chunk.subarray(0, 16).toString('utf8').trim().toLowerCase();

    if (head.startsWith('<') || head.startsWith('{')) {
      return false;
    }

    if (chunk[0] === TS_SYNC_BYTE) {
      return chunk.length % TS_PACKET_SIZE === 0;
    }

    return true;
  }

  /**
   * Скачивает один сегмент с повторами и проверкой целостности
   */
  private static async fetchSegment(
    url: string,
    headers: Record<string, string>,
    rangeHeader: string,
  ): Promise<Buffer | null> {
    const range = rangeHeader
      ? toRange(
          rangeHeader.replace('bytes=', '').replace(/(\d+)-(\d+)/, '$2'),
          0,
        )
      : null;

    const expected = rangeHeader
      ? Number(rangeHeader.split('-')[1]) -
        Number(rangeHeader.replace('bytes=', '').split('-')[0]) +
        1
      : 0;

    // eslint-disable-next-line no-plusplus
    for (let attempt = 1; attempt <= OFFLINE_HLS_SEGMENT_RETRIES; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await httpGet(
          url,
          rangeHeader ? { ...headers, Range: rangeHeader } : headers,
        );

        if (response.status >= 400) {
          // eslint-disable-next-line no-continue
          continue;
        }

        let { body } = response;

        if (expected > 0 && body.length > expected) {
          const start = Number(rangeHeader.replace('bytes=', '').split('-')[0]);
          body = body.subarray(start, start + expected);
        }

        if (expected > 0 && body.length !== expected) {
          log.warn('Range length mismatch:', body.length);
          // eslint-disable-next-line no-continue
          continue;
        }

        if (HlsDownloader.isMediaChunk(body)) {
          return body;
        }

        log.warn('Invalid chunk, retrying:', url);
      } catch (error) {
        log.error('Segment error:', error);
      }
    }

    // eslint-disable-next-line no-void
    void range;

    return null;
  }

  /**
   * Собирает локальный плейлист с байтовыми диапазонами
   */
  private static buildPlaylist(
    mediaFileName: string,
    segments: SegmentState[],
  ): string {
    const media = segments.filter((item) => !item.init);
    const init = segments.find((item) => item.init);

    const target = Math.ceil(
      media.reduce((max, item) => Math.max(max, item.duration), 0),
    );

    const lines = [
      '#EXTM3U',
      `#EXT-X-VERSION:${init ? 7 : 4}`,
      `#EXT-X-TARGETDURATION:${target || 10}`,
      '#EXT-X-PLAYLIST-TYPE:VOD',
      '#EXT-X-MEDIA-SEQUENCE:0',
    ];

    let offset = 0;

    if (init) {
      lines.push(
        `#EXT-X-MAP:URI="${mediaFileName}",BYTERANGE="${init.bytes}@0"`,
      );
      offset = init.bytes;
    }

    media.forEach((item) => {
      if (item.discontinuity) {
        lines.push('#EXT-X-DISCONTINUITY');
      }

      lines.push(`#EXTINF:${item.duration.toFixed(3)},`);
      lines.push(`#EXT-X-BYTERANGE:${item.bytes}@${offset}`);
      lines.push(mediaFileName);
      offset += item.bytes;
    });

    lines.push('#EXT-X-ENDLIST');

    return `${lines.join('\n')}\n`;
  }

  /**
   * Скачивает поток целиком с поддержкой докачки
   */
  public async download(params: HlsDownloadParams): Promise<HlsDownloadResult> {
    const { url, headers, mediaPath, playlistPath, mediaFileName } = params;

    const source = await httpGet(url, headers);
    let text = source.body.toString('utf8');
    let baseUrl = source.url;

    if (text.includes('#EXT-X-STREAM-INF')) {
      const variant = pickVariant(text, baseUrl);

      if (!variant) {
        log.error('No variant found');
        return { outcome: 'failed', bytes: 0 };
      }

      const media = await httpGet(variant, headers);
      text = media.body.toString('utf8');
      baseUrl = media.url;
    }

    const info = parsePlaylist(text, baseUrl);
    const { segments } = info;

    if (info.encrypted) {
      log.error('Encrypted stream is not supported');
      return { outcome: 'failed', bytes: 0 };
    }

    if (segments.length === 0) {
      log.error('Empty playlist');
      return { outcome: 'failed', bytes: 0 };
    }

    const done = this.readState(mediaPath, url);
    let bytes = done.reduce((sum, item) => sum + item.bytes, 0);

    if (done.length === 0) {
      fs.rmSync(mediaPath, { force: true });
    }

    const state = [...done];
    const stream = fs.createWriteStream(mediaPath, { flags: 'a' });
    let streamError: Error | null = null;
    stream.on('error', (error) => {
      streamError = error;
    });

    /** Закрывает поток и сохраняет состояние докачки в согласованном виде. */
    const finish = async (
      outcome: HlsDownloadResult['outcome'],
      written: number,
      keepState: boolean,
    ): Promise<HlsDownloadResult> => {
      await closeStream(stream);
      if (keepState) {
        await this.writeState(mediaPath, url, state);
      }
      return { outcome, bytes: written };
    };

    if (info.initUrl && state.length === 0) {
      const initChunk = await HlsDownloader.fetchSegment(
        info.initUrl,
        headers,
        info.initRangeHeader,
      );

      if (!initChunk) {
        log.error('Init segment failed');
        return finish('failed', 0, false);
      }

      await writeChunk(stream, initChunk);
      state.push({ bytes: initChunk.length, duration: 0, init: true });
      bytes += initChunk.length;
    }

    const initCount = state.some((item) => item.init) ? 1 : 0;
    const startIndex = Math.max(state.length - initCount, 0);

    log.debug(`Segments: ${segments.length}, resuming from ${startIndex}`);

    // eslint-disable-next-line no-plusplus
    for (let index = startIndex; index < segments.length; index++) {
      if (params.isCancelled()) {
        return finish('cancelled', bytes, true);
      }

      // eslint-disable-next-line no-await-in-loop
      const chunk = await HlsDownloader.fetchSegment(
        segments[index].url,
        headers,
        segments[index].rangeHeader,
      );

      if (!chunk) {
        log.error('Segment failed at:', index);
        return finish('failed', bytes, true);
      }

      const remaining =
        (bytes / Math.max(index, 1)) * (segments.length - index) || 0;

      if (!HlsDownloader.hasFreeSpace(mediaPath, remaining)) {
        return finish('no-space', bytes, true);
      }

      // eslint-disable-next-line no-await-in-loop
      await writeChunk(stream, chunk);

      if (streamError) {
        log.error('Write failed:', streamError);
        return finish('failed', bytes, true);
      }

      state.push({
        bytes: chunk.length,
        duration: segments[index].duration,
        discontinuity: segments[index].discontinuity,
      });

      bytes += chunk.length;

      if (index % 10 === 0) {
        // eslint-disable-next-line no-await-in-loop
        await this.writeState(mediaPath, url, state);
      }

      params.onProgress(
        bytes,
        Math.round(((index + 1) / segments.length) * 100),
      );
    }

    await closeStream(stream);

    if (streamError) {
      log.error('Write failed:', streamError);
      await this.writeState(mediaPath, url, state);
      return { outcome: 'failed', bytes };
    }

    await fsp.writeFile(
      playlistPath,
      HlsDownloader.buildPlaylist(mediaFileName, state),
      'utf8',
    );

    await fsp.rm(this.statePath(mediaPath), { force: true });

    log.debug('Completed, bytes:', bytes);

    return { outcome: 'completed', bytes };
  }
}

// eslint-disable-next-line import/prefer-default-export
export const hlsDownloader = new HlsDownloader();
