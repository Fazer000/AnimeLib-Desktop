/**
 * Очередь задач с ограничением одновременного выполнения
 */
export default class TaskQueue {
  private readonly limit: number;

  private active: number = 0;

  private readonly waiting: Array<() => void> = [];

  constructor(limit: number) {
    this.limit = Math.max(1, limit);
  }

  /**
   * Выполняет задачу, как только освободится место; результат — как у задачи
   */
  public async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => {
        this.waiting.push(resolve);
      });
    }

    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }

  /**
   * Сколько задач выполняется и ждёт
   */
  public get size(): { active: number; waiting: number } {
    return { active: this.active, waiting: this.waiting.length };
  }
}
