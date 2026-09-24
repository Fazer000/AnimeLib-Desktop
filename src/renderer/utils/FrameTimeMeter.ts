/**
 * Скользящее среднее времени кадра и доля кадров, не уложившихся в бюджет
 */
export default class FrameTimeMeter {
  private readonly samples: number[] = [];

  private readonly windowSize: number;

  constructor(windowSize: number) {
    this.windowSize = windowSize;
  }

  /**
   * Добавляет замер, вытесняя самый старый
   */
  public push(ms: number): void {
    this.samples.push(ms);
    if (this.samples.length > this.windowSize) this.samples.shift();
  }

  /**
   * Среднее время кадра, мс; 0 без замеров
   */
  public average(): number {
    if (!this.samples.length) return 0;

    return this.samples.reduce((sum, ms) => sum + ms, 0) / this.samples.length;
  }

  /**
   * Доля кадров дольше бюджета, от 0 до 1
   */
  public overBudgetShare(budgetMs: number): number {
    if (!this.samples.length) return 0;

    return (
      this.samples.filter((ms) => ms > budgetMs).length / this.samples.length
    );
  }

  public reset(): void {
    this.samples.length = 0;
  }
}
