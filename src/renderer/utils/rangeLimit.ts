/**
 * Ответы CDN на запросы частей файла, после которых стоит переждать
 */
import type { RateLimitInfo } from './rateLimitRetry';

/** 429 — слишком часто, 503 — перегрузка, 403 — CDN отказал */
const LIMIT_STATUSES = [403, 429, 503];

/**
 * Запрос части файла получил не 206
 */
export class RangeRequestError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null = null,
  ) {
    super(`Range request failed: ${status}`);
    this.name = 'RangeRequestError';
  }
}

/**
 * Нужно ли переждать после такой ошибки и сколько просит сервер
 */
export function inspectRangeLimit(error: unknown): RateLimitInfo {
  if (!(error instanceof RangeRequestError)) {
    return { limited: false };
  }

  return {
    limited: LIMIT_STATUSES.includes(error.status),
    retryAfter: error.retryAfter,
  };
}

export default inspectRangeLimit;
