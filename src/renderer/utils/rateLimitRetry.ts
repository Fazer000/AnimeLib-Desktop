/** Повтор запросов после ответа 429 с общей для всех запросов паузой */
import {
  API_RATE_LIMIT_BASE_DELAY_MS,
  API_RATE_LIMIT_MAX_DELAY_MS,
  API_RATE_LIMIT_RETRIES,
} from '../../constants';

export interface RateLimitInfo {
  limited: boolean;
  retryAfter?: string | null;
}

/**
 * Общая пауза запросов после 429; продлевается, но не сокращается
 */
export class RateLimitCooldown {
  private until: number = 0;

  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  /**
   * Продлевает паузу на ms от текущего момента
   */
  public extend(ms: number): void {
    this.until = Math.max(this.until, this.now() + ms);
  }

  /**
   * Сколько ещё ждать, мс
   */
  public remaining(): number {
    return Math.max(0, this.until - this.now());
  }
}

/** Пауза перед повтором по Retry-After */
export function getRateLimitDelayMs(
  attempt: number,
  retryAfter: string | null | undefined,
  now: number = Date.now(),
): number {
  let delay = API_RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt;

  if (retryAfter) {
    const seconds = Number(retryAfter);
    const date = Date.parse(retryAfter);

    if (Number.isFinite(seconds)) delay = seconds * 1000;
    else if (!Number.isNaN(date)) delay = date - now;
  }

  return Math.min(API_RATE_LIMIT_MAX_DELAY_MS, Math.max(0, delay));
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export interface RateLimitRetryOptions {
  cooldown: RateLimitCooldown;
  wait?: (ms: number) => Promise<void>;
  attempt?: number;
}

/** Выполняет задачу, дождавшись общей паузы */
export async function withRateLimitRetry<T>(
  task: () => Promise<T>,
  inspect: (error: unknown) => RateLimitInfo,
  { cooldown, wait = sleep, attempt = 0 }: RateLimitRetryOptions,
): Promise<T> {
  const pause = cooldown.remaining();
  if (pause > 0) {
    await wait(pause);
    return withRateLimitRetry(task, inspect, { cooldown, wait, attempt });
  }

  try {
    return await task();
  } catch (error) {
    const info = inspect(error);
    if (!info.limited || attempt >= API_RATE_LIMIT_RETRIES) throw error;

    cooldown.extend(getRateLimitDelayMs(attempt, info.retryAfter));
    return withRateLimitRetry(task, inspect, {
      cooldown,
      wait,
      attempt: attempt + 1,
    });
  }
}
