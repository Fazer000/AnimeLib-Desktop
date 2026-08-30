/**
 * Протокол доступа к локальным видеофайлам с поддержкой Range
 */
import fs from 'fs';
import { Readable } from 'stream';
import { BrowserWindow, protocol, session } from 'electron';
import { OFFLINE_SCHEME } from '../../constants';
import { offlineLibrary } from './OfflineLibrary';

import { createLogger } from '../../shared/logger';

const log = createLogger('OfflineProtocol');

const WEBVIEW_PARTITION = 'persist:webview';

const BUFFERED_RESPONSE_LIMIT = 24 * 1024 * 1024;

let getMainWindow: () => BrowserWindow | null = () => null;

const missingFiles = new Set<string>();

const MIME_TYPES: Record<string, string> = {
  '.img': 'image/jpeg',
  '.vtt': 'text/vtt',
  '.srt': 'text/plain',
  '.ass': 'text/plain',
  '.ssa': 'text/plain',
  '.txt': 'text/plain',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
};

/**
 * Определяет MIME-тип по расширению файла
 */
const resolveMimeType = (fileName: string): string =>
  MIME_TYPES[fileName.slice(fileName.lastIndexOf('.')).toLowerCase()] ||
  'video/mp4';

/**
 * Регистрирует схему до готовности приложения
 */
export const registerOfflineSchemes = (): void => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: OFFLINE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: true,
        corsEnabled: true,
      },
    },
  ]);
};

/**
 * Сообщает renderer об исчезнувшем файле один раз
 */
const notifyMissing = (fileName: string): void => {
  if (missingFiles.has(fileName)) {
    return;
  }

  missingFiles.add(fileName);
  log.error('File missing:', fileName);
  getMainWindow()?.webContents.send('offline-file-missing', fileName);
};

/**
 * Разбирает заголовок Range
 */
const parseRange = (
  range: string | null,
  size: number,
): { start: number; end: number } | null => {
  if (!range) {
    return null;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);

  if (!match) {
    return null;
  }

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : size - 1;

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start >= size ||
    start > end
  ) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
};

/**
 * Читает участок файла целиком в буфер
 */
const readSlice = async (
  filePath: string,
  start: number,
  length: number,
): Promise<Buffer> => {
  const handle = await fs.promises.open(filePath, 'r');

  try {
    const buffer = Buffer.allocUnsafe(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);

    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

/**
 * Обрабатывает запрос к локальному файлу
 */
const handleOfflineRequest = async (request: Request): Promise<Response> => {
  const rangeHeader = request.headers.get('Range');

  try {
    const url = new URL(request.url);
    const fileName = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const filePath = offlineLibrary.resolveFile(fileName);

    if (!fs.existsSync(filePath)) {
      notifyMissing(fileName);
      return new Response('Not found', { status: 404 });
    }

    const { size } = fs.statSync(filePath);

    if (size === 0) {
      notifyMissing(fileName);
      return new Response('Empty', { status: 404 });
    }

    missingFiles.delete(fileName);

    const isPlaylist = fileName.toLowerCase().endsWith('.m3u8');
    const range = isPlaylist ? null : parseRange(rangeHeader, size);
    const start = range ? range.start : 0;
    const end = range ? range.end : size - 1;
    const length = end - start + 1;

    const headers = {
      'Content-Length': String(length),
      'Content-Type': resolveMimeType(fileName),
      'Accept-Ranges': 'bytes',
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    };

    if (length <= BUFFERED_RESPONSE_LIMIT) {
      const buffer = await readSlice(filePath, start, length);

      if (buffer.length !== length) {
        log.error('Short read:', buffer.length, length);
        return new Response('Short read', { status: 500 });
      }

      return new Response(buffer as any, {
        status: range ? 206 : 200,
        headers,
      });
    }

    const stream = fs.createReadStream(filePath, { start, end });

    // eslint-disable-next-line no-undef
    stream.on('error', (error: NodeJS.ErrnoException) => {
      if (
        error.code === 'ABORT_ERR' ||
        error.code === 'ERR_STREAM_PREMATURE_CLOSE'
      ) {
        return;
      }
      log.error('Stream error:', error);
    });

    return new Response(Readable.toWeb(stream) as any, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    log.error('Error:', error);
    return new Response('Error', { status: 500 });
  }
};

/**
 * Регистрирует обработчик протокола в нужных сессиях
 */
export const registerOfflineProtocol = (
  getWindow: () => BrowserWindow | null,
): void => {
  getMainWindow = getWindow;

  protocol.handle(OFFLINE_SCHEME, handleOfflineRequest);
  session
    .fromPartition(WEBVIEW_PARTITION)
    .protocol.handle(OFFLINE_SCHEME, handleOfflineRequest);

  log.debug('Registered for default and webview sessions');
};
