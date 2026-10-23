export type TaskPriority = 'high' | 'low';

/** Очередь задач с ограничением одновременного выполнения и паузой после каждой задачи */
export default class PriorityTaskQueue {
  private readonly limit: number;

  private readonly gapMs: number;

  private active = 0;

  private readonly lanes: Record<TaskPriority, Array<() => void>> = {
    high: [],
    low: [],
  };

  constructor(limit: number, gapMs: number = 0) {
    this.limit = Math.max(1, limit);
    this.gapMs = Math.max(0, gapMs);
  }

  /**
   * Выполняет задачу в свою очередь; результат — как у задачи
   */
  public run<T>(task: () => Promise<T>, priority: TaskPriority): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.lanes[priority].push(async () => {
        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        } finally {
          this.release();
        }
      });
      this.pump();
    });
  }

  private release(): void {
    const done = () => {
      this.active -= 1;
      this.pump();
    };

    if (this.gapMs > 0) setTimeout(done, this.gapMs);
    else done();
  }

  private pump(): void {
    while (this.active < this.limit) {
      const next = this.lanes.high.shift() ?? this.lanes.low.shift();
      if (!next) return;

      this.active += 1;
      next();
    }
  }
}
