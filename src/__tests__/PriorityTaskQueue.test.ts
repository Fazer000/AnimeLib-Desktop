import PriorityTaskQueue from '../renderer/utils/PriorityTaskQueue';

const deferred = () => {
  let release: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: release };
};

describe('PriorityTaskQueue', () => {
  it('высокий приоритет обгоняет низкий в ожидании', async () => {
    const queue = new PriorityTaskQueue(1);
    const order: string[] = [];
    const first = deferred();

    const running = queue.run(async () => {
      order.push('first');
      await first.promise;
    }, 'low');
    const low = queue.run(async () => {
      order.push('low');
    }, 'low');
    const high = queue.run(async () => {
      order.push('high');
    }, 'high');

    first.resolve();
    await Promise.all([running, low, high]);

    expect(order).toEqual(['first', 'high', 'low']);
  });

  it('не запускает больше задач, чем разрешено', async () => {
    const queue = new PriorityTaskQueue(2);
    let active = 0;
    let peak = 0;

    const task = async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
    };

    await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        queue.run(task, index % 2 ? 'high' : 'low'),
      ),
    );

    expect(peak).toBe(2);
  });

  it('держит паузу после задачи', async () => {
    jest.useFakeTimers();
    const queue = new PriorityTaskQueue(1, 500);
    const started: number[] = [];

    queue.run(async () => {
      started.push(1);
    }, 'low');
    queue.run(async () => {
      started.push(2);
    }, 'low');

    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual([1]);

    await jest.advanceTimersByTimeAsync(500);
    expect(started).toEqual([1, 2]);
    jest.useRealTimers();
  });

  it('передаёт ошибку задачи и продолжает очередь', async () => {
    const queue = new PriorityTaskQueue(1);
    const failed = queue.run(async () => {
      throw new Error('boom');
    }, 'low');
    const next = queue.run(async () => 'ok', 'low');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
