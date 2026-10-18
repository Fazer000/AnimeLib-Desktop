/* global VideoDecoder, VideoDecoderConfig, VideoFrame, EncodedVideoChunk */
import {
  THUMBNAIL_HEIGHT,
  THUMBNAIL_MOOV_MAX_HOPS,
  THUMBNAIL_WIDTH,
} from '../../../constants';
import {
  Mp4VideoIndex,
  findKeyframeForCell,
  parseMp4Index,
  readBoxHeader,
} from '../../utils/mp4Index';
import { RangeRequestError, inspectRangeLimit } from '../../utils/rangeLimit';
import {
  RateLimitCooldown,
  withRateLimitRetry,
} from '../../utils/rateLimitRetry';

import { createLogger } from '../../../shared/logger';

const log = createLogger('KeyframeThumbnailSource');

const BOX_HEADER_PROBE = 16;
const HEAD_PROBE = 64 * 1024;
const JPEG_QUALITY = 0.7;

/**
 * Кадры превью прямо из MP4: индекс moov и опорные кадры читаются
 * запросами по диапазону байт и декодируются через WebCodecs
 */
class KeyframeThumbnailSource {
  private index: Mp4VideoIndex | null = null;

  private decoder: VideoDecoder | null = null;

  private preparing: Promise<boolean> | null = null;

  private broken = false;

  private url: string;

  private readonly cooldown = new RateLimitCooldown();

  private decodeChain: Promise<unknown> = Promise.resolve();

  private frameWaiters: Array<(frame: VideoFrame | null) => void> = [];

  private readonly canvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(private readonly src: string) {
    this.url = src;
    this.canvas = document.createElement('canvas');
    this.canvas.width = THUMBNAIL_WIDTH;
    this.canvas.height = THUMBNAIL_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
  }

  /**
   * Источник непригоден: дальше кадры берутся запасным способом
   */
  isBroken(): boolean {
    return this.broken;
  }

  /**
   * CDN попросил переждать: запросы к файлу стоят на общей паузе
   */
  isCoolingDown(): boolean {
    return this.cooldown.remaining() > 0;
  }

  /**
   * Индекс загружен и декодер готов
   */
  isReady(): boolean {
    return Boolean(this.index && this.decoder) && !this.broken;
  }

  /**
   * Загружает индекс и готовит декодер; false — файл не подходит
   */
  prepare(): Promise<boolean> {
    if (!this.preparing) {
      this.preparing = this.load().catch((error) => {
        log.debug('Keyframe source unavailable:', error);
        this.broken = true;
        return false;
      });
    }

    return this.preparing;
  }

  /**
   * Кадр для ячейки [start, end) в виде JPEG data URL
   */
  async grab(start: number, end: number): Promise<string> {
    if (!(await this.prepare()) || !this.index) {
      throw new Error('Keyframe source unavailable');
    }

    const keyframe = findKeyframeForCell(this.index.keyframes, start, end);
    if (!keyframe) throw new Error('No keyframe');

    const data = await this.fetchRange(
      keyframe.offset,
      keyframe.offset + keyframe.size - 1,
    );

    return this.decode(data, keyframe.time);
  }

  dispose(): void {
    this.broken = true;
    this.flushWaiters();

    if (this.decoder && this.decoder.state !== 'closed') {
      this.decoder.close();
    }
    this.decoder = null;
  }

  private async load(): Promise<boolean> {
    if (typeof VideoDecoder === 'undefined' || !this.ctx) return false;

    const moov = await this.fetchMoov();
    const index = moov && parseMp4Index(moov);
    if (!index || index.keyframes.length === 0) return false;

    const config: VideoDecoderConfig = {
      codec: index.codec,
      description: index.description,
      codedWidth: index.width,
      codedHeight: index.height,
    };

    const { supported } = await VideoDecoder.isConfigSupported(config);
    if (!supported) return false;

    this.decoder = new VideoDecoder({
      output: (frame) => {
        const waiter = this.frameWaiters.shift();
        if (waiter) waiter(frame);
        else frame.close();
      },
      error: (error) => {
        log.debug('Decoder error:', error);
        this.broken = true;
        this.flushWaiters();
      },
    });
    this.decoder.configure(config);
    this.index = index;

    log.debug(
      `Keyframe index: ${index.keyframes.length} frames, ${index.codec}`,
    );
    return true;
  }

  /**
   * Ищет moov по заголовкам верхнего уровня: в начале или в конце файла.
   * Первым запросом берётся начало файла целиком, чтобы не ходить за
   * каждым заголовком отдельно
   */
  private async fetchMoov(): Promise<Uint8Array | null> {
    let chunk = await this.fetchRange(0, HEAD_PROBE - 1);
    let chunkStart = 0;
    let offset = 0;

    for (let hop = 0; hop < THUMBNAIL_MOOV_MAX_HOPS; hop += 1) {
      if (offset + BOX_HEADER_PROBE > chunkStart + chunk.length) {
        // eslint-disable-next-line no-await-in-loop
        chunk = await this.fetchRange(offset, offset + BOX_HEADER_PROBE - 1);
        chunkStart = offset;
      }

      const header = readBoxHeader(chunk, offset - chunkStart);

      if (!header || !Number.isFinite(header.size) || header.size < 8) {
        return null;
      }

      if (header.type === 'moov') {
        const local = offset - chunkStart;

        return local + header.size <= chunk.length
          ? chunk.slice(local, local + header.size)
          : this.fetchRange(offset, offset + header.size - 1);
      }

      offset += header.size;
    }

    return null;
  }

  /**
   * Читает диапазон байт. На 429, 503 и 403 все запросы источника ждут
   * общую паузу и повторяются; если CDN так и не пустил — источник
   * уходит в запасной способ. Ответ без поддержки частей (не 206) —
   * сразу запасной способ
   */
  private async fetchRange(start: number, end: number): Promise<Uint8Array> {
    try {
      return await withRateLimitRetry(
        () => this.requestRange(start, end),
        inspectRangeLimit,
        { cooldown: this.cooldown },
      );
    } catch (error) {
      if (inspectRangeLimit(error).limited) {
        log.warn('CDN keeps refusing range requests, falling back:', error);
        this.broken = true;
      }
      throw error;
    }
  }

  private async requestRange(start: number, end: number): Promise<Uint8Array> {
    const controller = new AbortController();
    const response = await fetch(this.url, {
      headers: { Range: `bytes=${start}-${end}` },
      signal: controller.signal,
    });

    if (response.status !== 206) {
      controller.abort();
      const error = new RangeRequestError(
        response.status,
        response.headers.get('Retry-After'),
      );

      if (!inspectRangeLimit(error).limited) {
        this.broken = true;
      }
      throw error;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (bytes.length === 0) {
      throw new Error('Empty range response');
    }

    if (response.redirected) {
      this.url = response.url;
    }

    return bytes;
  }

  /**
   * Декодирует опорный кадр; кадры идут через декодер строго по очереди
   */
  private decode(data: Uint8Array, time: number): Promise<string> {
    const run = this.decodeChain.then(async () => {
      const { decoder, ctx } = this;
      if (!decoder || decoder.state !== 'configured' || !ctx || this.broken) {
        throw new Error('Decoder unavailable');
      }

      const frameReady = new Promise<VideoFrame | null>((resolve) => {
        this.frameWaiters.push(resolve);
      });

      decoder.decode(
        new EncodedVideoChunk({
          type: 'key',
          timestamp: Math.round(time * 1e6),
          data,
        }),
      );
      await decoder.flush();

      const frame = await frameReady;
      if (!frame) throw new Error('Frame not decoded');

      ctx.drawImage(frame, 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
      frame.close();

      return this.canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    });

    this.decodeChain = run.catch(() => undefined);
    return run;
  }

  private flushWaiters(): void {
    this.frameWaiters.splice(0).forEach((waiter) => waiter(null));
  }
}

export default KeyframeThumbnailSource;
