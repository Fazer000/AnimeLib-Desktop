import LruCache from '../renderer/utils/LruCache';

describe('LruCache', () => {
  it('отдаёт положенное значение', () => {
    const cache = new LruCache<string>(2);

    cache.set('a', '1');

    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(1);
  });

  it('вытесняет самую давнюю запись при переполнении', () => {
    const evicted: string[] = [];
    const cache = new LruCache<string>(2, (value) => evicted.push(value));

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    expect(cache.has('a')).toBe(false);
    expect(cache.size).toBe(2);
    expect(evicted).toEqual(['1']);
  });

  it('чтение обновляет свежесть записи', () => {
    const cache = new LruCache<string>(2);

    cache.set('a', '1');
    cache.set('b', '2');
    cache.get('a');
    cache.set('c', '3');

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('has не меняет порядок вытеснения', () => {
    const cache = new LruCache<string>(2);

    cache.set('a', '1');
    cache.set('b', '2');
    cache.has('a');
    cache.set('c', '3');

    expect(cache.has('a')).toBe(false);
  });

  it('перезапись ключа отдаёт прежнее значение на вытеснение', () => {
    const evicted: string[] = [];
    const cache = new LruCache<string>(2, (value) => evicted.push(value));

    cache.set('a', '1');
    cache.set('a', '2');

    expect(cache.get('a')).toBe('2');
    expect(cache.size).toBe(1);
    expect(evicted).toEqual(['1']);
  });

  it('очистка отдаёт все записи обработчику', () => {
    const evicted: string[] = [];
    const cache = new LruCache<string>(3, (value) => evicted.push(value));

    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();

    expect(cache.size).toBe(0);
    expect(evicted).toEqual(['1', '2']);
  });

  it('нулевой лимит хранит хотя бы одну запись', () => {
    const cache = new LruCache<string>(0);

    cache.set('a', '1');

    expect(cache.get('a')).toBe('1');
  });
});
