/** Учёт проигранного после последней перемотки времени */
export default class PlaybackTracker {
  private lastTime: number | null = null;

  private sinceSeek: number = 0;

  private readonly maxStep: number;

  constructor(maxStepS: number) {
    this.maxStep = maxStepS;
  }

  /** Учитывает новое время воспроизведения */
  update(time: number, playing: boolean): void {
    if (this.lastTime === null) {
      this.lastTime = time;
      return;
    }

    const delta = time - this.lastTime;
    this.lastTime = time;

    if (delta < 0 || delta > this.maxStep) {
      this.sinceSeek = 0;
      return;
    }

    if (playing && delta > 0) {
      this.sinceSeek += delta;
    }
  }

  /** Проиграно после последней перемотки, с */
  get playedSinceSeek(): number {
    return this.sinceSeek;
  }

  /** Сбрасывает учёт для новой серии */
  reset(): void {
    this.lastTime = null;
    this.sinceSeek = 0;
  }
}
