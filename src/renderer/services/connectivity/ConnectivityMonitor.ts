/**
 * Кэшируемый статус связи с сайтом
 */
import {
  ConnectivityProbeResult,
  CONNECTIVITY_FAST_DEADLINE_MS,
  CONNECTIVITY_STATUS_TTL_MS,
  CONNECTIVITY_TIMEOUT_FAILURES,
} from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('Connectivity');

export interface ConnectivityMonitorConfig {
  probe: () => Promise<ConnectivityProbeResult>;
  isInterfaceOnline: () => boolean;
  now?: () => number;
  ttlMs?: number;
  fastDeadlineMs?: number;
  timeoutFailures?: number;
}

/**
 * Хранит последний вердикт о доступности сайта, объединяет параллельные
 * пробы и не роняет статус в оффлайн по одиночному таймауту
 */
export class ConnectivityMonitor {
  private status: boolean | null = null;

  private checkedAt: number = Number.NEGATIVE_INFINITY;

  private pending: Promise<boolean> | null = null;

  private timeouts: number = 0;

  private config: Required<ConnectivityMonitorConfig>;

  constructor(config: ConnectivityMonitorConfig) {
    this.config = {
      now: () => Date.now(),
      ttlMs: CONNECTIVITY_STATUS_TTL_MS,
      fastDeadlineMs: CONNECTIVITY_FAST_DEADLINE_MS,
      timeoutFailures: CONNECTIVITY_TIMEOUT_FAILURES,
      ...config,
    };
  }

  /**
   * Возвращает последний вердикт либо null, если он неизвестен
   */
  public getStatus(): boolean | null {
    return this.status;
  }

  /**
   * Фиксирует потерю сетевого интерфейса
   */
  public markOffline(): void {
    this.status = false;
    this.checkedAt = this.config.now();
    this.timeouts = 0;
  }

  /**
   * Помечает кэш устаревшим
   */
  public invalidate(): void {
    this.checkedAt = Number.NEGATIVE_INFINITY;
  }

  /**
   * Возвращает вердикт, дожидаясь пробы при устаревшем кэше
   */
  public async check(): Promise<boolean> {
    if (!this.config.isInterfaceOnline()) {
      this.markOffline();

      return false;
    }

    if (this.isFresh()) {
      return this.status as boolean;
    }

    return this.run();
  }

  /**
   * Возвращает вердикт, но ждёт пробу не дольше дедлайна.
   * Не уложилась — считаем связь потерянной, проба дорабатывает в фоне
   */
  public async checkFast(): Promise<boolean> {
    if (!this.config.isInterfaceOnline()) {
      this.markOffline();

      return false;
    }

    if (this.isFresh()) {
      return this.status as boolean;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const deadline = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => {
        log.debug('Fast check deadline reached, assuming offline');
        resolve(false);
      }, this.config.fastDeadlineMs);
    });

    try {
      return await Promise.race([this.run(), deadline]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Проверяет, не истёк ли срок годности вердикта
   */
  private isFresh(): boolean {
    return (
      this.status !== null &&
      this.config.now() - this.checkedAt < this.config.ttlMs
    );
  }

  /**
   * Запускает пробу либо присоединяется к уже идущей
   */
  private run(): Promise<boolean> {
    if (!this.pending) {
      this.pending = this.config
        .probe()
        .then((result) => this.apply(result))
        .catch(() => this.apply({ ok: false, reason: 'network' }))
        .finally(() => {
          this.pending = null;
        });
    }

    return this.pending;
  }

  /**
   * Переводит исход пробы в вердикт
   */
  private apply(result: ConnectivityProbeResult): boolean {
    if (result.reason === 'timeout') {
      this.timeouts += 1;

      if (this.status === true && this.timeouts < this.config.timeoutFailures) {
        log.debug('Timeout ignored, keeping online:', this.timeouts);

        return true;
      }
    } else {
      this.timeouts = 0;
    }

    this.status = result.ok;
    this.checkedAt = this.config.now();

    return this.status;
  }
}

export default ConnectivityMonitor;
