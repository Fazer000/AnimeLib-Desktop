export type PlaybackTimeListener = (
  currentTime: number,
  buffered: number,
) => void;

/**
 * Держит время воспроизведения вне состояния React: обновляется десять раз
 * в секунду, поэтому подписчики читают его напрямую, без перерисовки дерева.
 */
export class PlaybackTimeStore {
  private currentTime = 0;

  private buffered = 0;

  private listeners = new Set<PlaybackTimeListener>();

  /** Возвращает функцию отписки. */
  subscribe(listener: PlaybackTimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  set(currentTime: number, buffered?: number): void {
    this.currentTime = currentTime;
    if (buffered !== undefined) {
      this.buffered = buffered;
    }

    this.listeners.forEach((listener) =>
      listener(this.currentTime, this.buffered),
    );
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getBuffered(): number {
    return this.buffered;
  }

  reset(): void {
    this.set(0, 0);
  }
}

export default PlaybackTimeStore;
