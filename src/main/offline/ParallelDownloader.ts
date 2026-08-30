/**
 * Многопоточная загрузка файла по байтовым диапазонам
 */
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import {
  OFFLINE_MIN_FREE_SPACE_BYTES,
  OFFLINE_PARALLEL_STATE_SUFFIX,
  OFFLINE_PROGRESS_THROTTLE_MS,
} from '../../constants';

import { createLogger } from '../../shared/logger';

const log = createLogger('ParallelDownloader');

export type ParallelOutcome =
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'no-space'
  | 'unsupported';

export interface ParallelDownloadParams {
  url: string;
  headers: Record<string, string>;
  destination: string;
  connections: number;
  onProgress: (loaded: number, total: number) => void;
  registerAbort: (abort: () => void) => void;
}

interface Part {
  start: number;
  end: number;
  loaded: number;
}

/**
 * Открывает поток ответа с поддержкой редиректов
 */
const openStream = (
  url: string,
  headers: Record<string, string>,
  onRequest: (request: http.ClientRequest) => void,
  redirects = 5,
): Promise<http.IncomingMessage> =>
  new Promise((resolve, reject) => {
    const client = url.startsWith('http://') ? http : https;

    const request = client.get(url, { headers }, (response) => {
      const { statusCode, headers: responseHeaders } = response;

      if (
        statusCode &&
        statusCode >= 300 &&
        statusCode < 400 &&
        responseHeaders.location &&
        redirects > 0
      ) {
        response.resume();
        resolve(
          openStream(
            new URL(responseHeaders.location, url).href,
            headers,
            onRequest,
            redirects - 1,
          ),
        );
        return;
      }

      resolve(response);
    });

    request.on('error', reject);
    onRequest(request);
    request.end();
  });

/**
 * Узнаёт размер файла и поддержку диапазонов
 */
const probeSize = async (
  url: string,
  headers: Record<string, string>,
): Promise<number> => {
  const response = await openStream(
    url,
    { ...headers, Range: 'bytes=0-0' },
    () => {},
  );

  const contentRange = String(response.headers['content-range'] || '');
  const status = response.statusCode;

  response.destroy();

  if (status !== 206 || !contentRange.includes('/')) {
    return 0;
  }

  const size = Number(contentRange.split('/')[1]);

  return Number.isFinite(size) && size > 0 ? size : 0;
};

/**
 * Скачивает один диапазон в файл по смещению
 */
const downloadPart = async (
  params: ParallelDownloadParams,
  part: Part,
  onChunk: (bytes: number) => void,
  addRequest: (request: http.ClientRequest) => void,
): Promise<boolean> => {
  const from = part.start + part.loaded;

  if (from > part.end) {
    return true;
  }

  const response = await openStream(
    params.url,
    { ...params.headers, Range: `bytes=${from}-${part.end}` },
    addRequest,
  );

  if (response.statusCode !== 206) {
    response.destroy();
    return false;
  }

  return new Promise((resolve) => {
    const file = fs.createWriteStream(params.destination, {
      flags: 'r+',
      start: from,
    });

    response.on('data', (chunk: Buffer) => {
      part.loaded += chunk.length;
      onChunk(chunk.length);
    });

    response.on('error', () => resolve(false));
    file.on('error', () => resolve(false));
    file.on('finish', () => file.close(() => resolve(true)));

    response.pipe(file);
  });
};

class ParallelDownloader {
  /**
   * Возвращает путь к файлу состояния
   */
  // eslint-disable-next-line class-methods-use-this
  private statePath(destination: string): string {
    return `${destination}${OFFLINE_PARALLEL_STATE_SUFFIX}`;
  }

  /**
   * Читает состояние докачки, согласованное с файлом
   */
  private readState(
    destination: string,
    url: string,
    size: number,
  ): Part[] | null {
    try {
      const raw = fs.readFileSync(this.statePath(destination), 'utf8');
      const parsed = JSON.parse(raw);

      if (
        parsed?.url !== url ||
        parsed?.size !== size ||
        !Array.isArray(parsed?.parts) ||
        fs.statSync(destination).size !== size
      ) {
        return null;
      }

      return parsed.parts;
    } catch {
      return null;
    }
  }

  /**
   * Пишет состояние докачки
   */
  private writeState(
    destination: string,
    url: string,
    size: number,
    parts: Part[],
  ): void {
    try {
      fs.writeFileSync(
        this.statePath(destination),
        JSON.stringify({ url, size, parts }),
        'utf8',
      );
    } catch (error) {
      log.error('Failed to write state:', error);
    }
  }

  /**
   * Проверяет свободное место
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
   * Делит файл на равные диапазоны
   */
  private static createParts(size: number, connections: number): Part[] {
    const count = Math.max(1, Math.min(connections, Math.ceil(size / 1048576)));
    const chunk = Math.ceil(size / count);

    return Array.from({ length: count }, (item, index) => ({
      start: index * chunk,
      end: Math.min((index + 1) * chunk, size) - 1,
      loaded: 0,
    })).filter((part) => part.end >= part.start);
  }

  /**
   * Качает файл несколькими соединениями с докачкой
   */
  public async download(
    params: ParallelDownloadParams,
  ): Promise<ParallelOutcome> {
    const size = await probeSize(params.url, params.headers).catch(() => 0);

    if (!size) {
      log.debug('Ranges not supported');
      return 'unsupported';
    }

    if (!ParallelDownloader.hasFreeSpace(params.destination, size)) {
      return 'no-space';
    }

    const saved = this.readState(params.destination, params.url, size);
    const parts =
      saved ?? ParallelDownloader.createParts(size, params.connections);

    if (!saved) {
      fs.writeFileSync(params.destination, '');
      fs.truncateSync(params.destination, size);
    }

    const requests = new Set<http.ClientRequest>();
    let cancelled = false;

    params.registerAbort(() => {
      cancelled = true;
      requests.forEach((request) => request.destroy());
    });

    let loaded = parts.reduce((sum, part) => sum + part.loaded, 0);
    let lastSave = Date.now();

    log.debug(`Size: ${size}, parts: ${parts.length}, resume: ${loaded}`);

    const onChunk = (bytes: number) => {
      loaded += bytes;
      params.onProgress(loaded, size);

      const now = Date.now();

      if (now - lastSave > OFFLINE_PROGRESS_THROTTLE_MS * 4) {
        lastSave = now;
        this.writeState(params.destination, params.url, size, parts);
      }
    };

    const results = await Promise.all(
      parts.map((part) =>
        downloadPart(params, part, onChunk, (request) =>
          requests.add(request),
        ).catch(() => false),
      ),
    );

    if (cancelled) {
      this.writeState(params.destination, params.url, size, parts);
      return 'cancelled';
    }

    const complete =
      results.every(Boolean) &&
      parts.every((part) => part.loaded === part.end - part.start + 1);

    if (!complete) {
      this.writeState(params.destination, params.url, size, parts);
      log.error('Incomplete download');
      return 'failed';
    }

    fs.rmSync(this.statePath(params.destination), { force: true });
    log.debug('Completed:', size);

    return 'completed';
  }
}

// eslint-disable-next-line import/prefer-default-export
export const parallelDownloader = new ParallelDownloader();
