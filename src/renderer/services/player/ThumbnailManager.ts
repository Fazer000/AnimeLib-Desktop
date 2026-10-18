import { createLogger } from '../../../shared/logger';
import {
  THUMBNAIL_CACHE_SIZE,
  THUMBNAIL_KEYFRAME_CONCURRENCY,
  THUMBNAIL_NEAREST_RADIUS,
  THUMBNAIL_STEP_SECONDS,
} from '../../../constants';
import {
  buildPrecacheOrder,
  findNearestTime,
  resolveGridStep,
  snapToGrid,
} from '../../utils/thumbnailGrid';
import ThumbnailGrabber from './ThumbnailGrabber';
import KeyframeThumbnailSource from './KeyframeThumbnailSource';

const log = createLogger('ThumbnailManager');

interface HoverWaiter {
  resolve: (url: string) => void;
  reject: (error: Error) => void;
}

/**
 * Кадры превью для полоски по сетке в несколько секунд. Основной способ —
 * опорные кадры прямо из MP4; запасной — перемотка скрытых видео, отдельных
 * для наведения и фоновой подготовки
 */
class ThumbnailManager {
  private videoSrc: string | null = null;

  private readonly hoverGrabber = new ThumbnailGrabber();

  private readonly precacheGrabber = new ThumbnailGrabber();

  private keyframeSource: KeyframeThumbnailSource | null = null;

  private playbackBuffering = false;

  private playbackWaiters: Array<() => void> = [];

  private cache: Map<number, string> = new Map();

  private gridStep = THUMBNAIL_STEP_SECONDS;

  private hoverTarget: number | null = null;

  private hoverWaiters: Map<number, HoverWaiter[]> = new Map();

  private isHoverRunning = false;

  private precacheQueue: number[] = [];

  private precacheRetried: Set<number> = new Set();

  private isPrecacheRunning = false;

  private preCachingStarted = false;

  private epoch = 0;

  private isDestroyed = false;

  /**
   * Запоминает источник кадров и сразу начинает грузить индекс MP4.
   * Скрытые видео создаются лениво; смена источника сбрасывает кэш и очереди
   */
  loadVideo(src: string): void {
    if (this.videoSrc === src) return;

    log.debug('Video source set:', src);
    this.reset();
    this.videoSrc = src;
    this.hoverGrabber.setSource(src);
    this.precacheGrabber.setSource(src);
    this.keyframeSource?.dispose();
    this.keyframeSource = new KeyframeThumbnailSource(src);
    this.keyframeSource.prepare();
  }

  /**
   * Пока основное видео буферизуется, фоновая подготовка ждёт,
   * чтобы не отбирать у него сеть
   */
  setPlaybackBuffering(buffering: boolean): void {
    this.playbackBuffering = buffering;

    if (!buffering) {
      this.playbackWaiters.splice(0).forEach((resume) => resume());
    }
  }

  /**
   * Время ячейки сетки, кадр которой показывается для этого момента
   */
  toGridTime(time: number): number {
    return snapToGrid(time, this.gridStep);
  }

  /**
   * Фоновая подготовка всех кадров сетки, равномерно по всей длительности. Запускается
   * один раз на источник: вскоре после загрузки видео или при наведении
   */
  startPreCaching(duration: number): void {
    if (duration <= 0 || !this.videoSrc || this.preCachingStarted) return;

    this.preCachingStarted = true;
    this.gridStep = resolveGridStep(
      duration,
      THUMBNAIL_STEP_SECONDS,
      THUMBNAIL_CACHE_SIZE,
    );
    this.precacheQueue = buildPrecacheOrder(duration, this.gridStep).filter(
      (time) => !this.cache.has(time),
    );

    log.debug(
      `Pre-caching ${this.precacheQueue.length} frames every ${this.gridStep}s`,
    );

    this.runPrecache();
  }

  getExactCached(time: number): string | null {
    return this.cache.get(this.toGridTime(time)) || null;
  }

  /**
   * Ближайший готовый кадр не дальше радиуса. По умолчанию — соседний:
   * размытым он похож на кадр, который вот-вот придёт
   */
  getNearestCached(
    time: number,
    radius: number = THUMBNAIL_NEAREST_RADIUS,
  ): string | null {
    const gridTime = this.toGridTime(time);
    const nearest = findNearestTime(this.cache.keys(), gridTime);

    if (nearest === null) return null;

    return Math.abs(nearest - gridTime) <= Math.max(radius, this.gridStep)
      ? this.cache.get(nearest) || null
      : null;
  }

  /**
   * Кадр под курсором. Побеждает последний запрос: пока идёт перемотка,
   * промежуточные ячейки пропускаются, а их ожидания отменяются
   */
  getThumbnail(time: number): Promise<string> {
    if (this.isDestroyed) {
      return Promise.reject(new Error('ThumbnailManager is destroyed'));
    }

    if (!this.videoSrc) {
      return Promise.reject(new Error('Video source not set'));
    }

    const gridTime = this.toGridTime(time);
    const cached = this.cache.get(gridTime);
    if (cached) return Promise.resolve(cached);

    if (this.hoverTarget !== null && this.hoverTarget !== gridTime) {
      this.settleHover(this.hoverTarget, new Error('Superseded'));
    }

    this.hoverTarget = gridTime;

    return new Promise((resolve, reject) => {
      const waiters = this.hoverWaiters.get(gridTime) || [];
      waiters.push({ resolve, reject });
      this.hoverWaiters.set(gridTime, waiters);
      this.runHover();
    });
  }

  clearCache(): void {
    log.debug('Clearing cache');
    this.reset();
  }

  destroy(): void {
    log.debug('Destroying');
    this.isDestroyed = true;
    this.reset();
    this.hoverGrabber.dispose();
    this.precacheGrabber.dispose();
    this.keyframeSource?.dispose();
    this.keyframeSource = null;
    this.setPlaybackBuffering(false);
    this.videoSrc = null;
  }

  /**
   * Сбрасывает кэш, очереди и ожидания; текущие циклы завершатся сами
   */
  private reset(): void {
    this.epoch += 1;
    this.cache.clear();
    this.precacheQueue = [];
    this.precacheRetried.clear();
    this.preCachingStarted = false;
    this.gridStep = THUMBNAIL_STEP_SECONDS;
    this.hoverTarget = null;
    this.hoverWaiters.forEach((waiters) =>
      waiters.forEach((waiter) => waiter.reject(new Error('Cache cleared'))),
    );
    this.hoverWaiters.clear();
  }

  private addToCache(time: number, dataUrl: string): void {
    if (this.cache.size >= THUMBNAIL_CACHE_SIZE && !this.cache.has(time)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(time, dataUrl);
  }

  /**
   * Отдаёт ожидающим кадр ячейки или ошибку
   */
  private settleHover(time: number, error?: Error): void {
    const waiters = this.hoverWaiters.get(time);
    if (!waiters) return;

    this.hoverWaiters.delete(time);
    const url = this.cache.get(time);

    waiters.forEach((waiter) =>
      url && !error
        ? waiter.resolve(url)
        : waiter.reject(error || new Error('Frame failed')),
    );
  }

  /**
   * Цикл наведения: снимает кадр последней запрошенной ячейки
   */
  private async runHover(): Promise<void> {
    if (this.isHoverRunning) return;
    this.isHoverRunning = true;

    while (this.hoverTarget !== null) {
      const time = this.hoverTarget;
      const { epoch } = this;

      if (!this.cache.has(time)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const url = await this.grabFrame(time, this.hoverGrabber, false);
          if (epoch === this.epoch) this.addToCache(time, url);
        } catch (error) {
          log.debug('Hover frame failed:', time, error);
        }
      }

      if (epoch === this.epoch) {
        if (this.hoverTarget === time) this.hoverTarget = null;
        this.settleHover(time);
      }
    }

    this.isHoverRunning = false;
  }

  /**
   * Кадр ячейки: опорный кадр из файла, а если файл не подходит —
   * перемоткой скрытого видео. Наведение не ждёт ни индекс, ни паузу CDN:
   * в это время кадр снимается перемоткой
   */
  private async grabFrame(
    time: number,
    grabber: ThumbnailGrabber,
    waitForIndex: boolean,
  ): Promise<string> {
    const source = this.keyframeSource;
    const usable =
      source && !source.isBroken() && (waitForIndex || !source.isCoolingDown());
    const ready = usable
      ? source.isReady() || (waitForIndex && (await source.prepare()))
      : false;

    if (source && !ready && !source.isBroken()) {
      source.prepare();
    }

    if (source && ready) {
      try {
        return await source.grab(time, time + this.gridStep);
      } catch (error) {
        if (!source.isBroken()) throw error;
        log.debug('Keyframe source failed, falling back to seeking');
      }
    }

    return grabber.grab(time);
  }

  private usesKeyframes(): boolean {
    return Boolean(this.keyframeSource && !this.keyframeSource.isBroken());
  }

  private waitForPlayback(): Promise<void> {
    if (!this.playbackBuffering) return Promise.resolve();

    return new Promise((resolve) => {
      this.playbackWaiters.push(resolve);
    });
  }

  /**
   * Фоновый цикл: опорные кадры грузятся в несколько потоков,
   * перемотка — в один
   */
  private async runPrecache(): Promise<void> {
    if (this.isPrecacheRunning) return;
    this.isPrecacheRunning = true;

    const fast = Boolean(await this.keyframeSource?.prepare());
    const workers = fast ? THUMBNAIL_KEYFRAME_CONCURRENCY : 1;

    await Promise.all(
      Array.from({ length: workers }, (_, index) => this.precacheWorker(index)),
    );

    this.isPrecacheRunning = false;

    if (this.precacheQueue.length > 0) {
      this.runPrecache();
    }
  }

  /**
   * Поток фоновой подготовки; неудавшийся кадр повторяется один раз в конце.
   * Если файл оказался неподходящим, лишние потоки останавливаются: скрытое
   * видео перематывается только по одному кадру за раз
   */
  private async precacheWorker(index: number): Promise<void> {
    while (this.precacheQueue.length > 0) {
      if (index > 0 && !this.usesKeyframes()) break;

      // eslint-disable-next-line no-await-in-loop
      await this.waitForPlayback();

      const time = this.precacheQueue.shift();
      if (time === undefined) break;

      const { epoch } = this;

      if (!this.cache.has(time)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const url = await this.grabFrame(time, this.precacheGrabber, true);
          if (epoch === this.epoch) this.addToCache(time, url);
        } catch (error) {
          log.debug('Precache frame failed:', time, error);
          if (epoch === this.epoch && !this.precacheRetried.has(time)) {
            this.precacheRetried.add(time);
            this.precacheQueue.push(time);
          }
        }
      }

      if (epoch !== this.epoch) break;
    }
  }
}

export default ThumbnailManager;
