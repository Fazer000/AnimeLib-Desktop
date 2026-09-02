/**
 * Кэш с ограничением размера и вытеснением давно не используемых записей
 */
export default class LruCache<T> {
  private limit: number;

  private onEvict?: (value: T) => void;

  private entries = new Map<string, T>();

  constructor(limit: number, onEvict?: (value: T) => void) {
    this.limit = Math.max(1, limit);
    this.onEvict = onEvict;
  }

  /**
   * Возвращает запись, помечая её как недавно использованную
   */
  get(key: string): T | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }

    const value = this.entries.get(key) as T;
    this.entries.delete(key);
    this.entries.set(key, value);

    return value;
  }

  /**
   * Кладёт запись, вытесняя самую давнюю при переполнении
   */
  set(key: string, value: T): void {
    const previous = this.entries.get(key);

    if (previous !== undefined) {
      this.entries.delete(key);

      if (previous !== value) {
        this.onEvict?.(previous);
      }
    }

    this.entries.set(key, value);

    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value as string;
      const evicted = this.entries.get(oldest) as T;

      this.entries.delete(oldest);
      this.onEvict?.(evicted);
    }
  }

  /**
   * Сообщает, есть ли запись, не меняя порядок вытеснения
   */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Возвращает текущее число записей
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Очищает кэш, отдавая каждую запись обработчику вытеснения
   */
  clear(): void {
    this.entries.forEach((value) => this.onEvict?.(value));
    this.entries.clear();
  }
}
