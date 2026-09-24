import TaskQueue from '../renderer/utils/TaskQueue';
import {
  getRateLimitDelayMs,
  RateLimitCooldown,
  withRateLimitRetry,
} from '../renderer/utils/rateLimitRetry';

const deferred = () => {
  let release: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: () => release() };
};

const flush = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

describe('TaskQueue', () => {
  it('держит не больше заданного числа задач одновременно', async () => {
    const queue = new TaskQueue(2);
    const gates = [deferred(), deferred(), deferred()];
    const results = gates.map((gate, index) =>
      queue.run(async () => {
        await gate.promise;
        return index;
      }),
    );

    await flush();
    expect(queue.size).toEqual({ active: 2, waiting: 1 });

    gates[0].resolve();
    await flush();
    expect(queue.size).toEqual({ active: 2, waiting: 0 });

    gates[1].resolve();
    gates[2].resolve();
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2]);
    expect(queue.size).toEqual({ active: 0, waiting: 0 });
  });

  it('ошибка задачи освобождает место', async () => {
    const queue = new TaskQueue(1);

    await expect(
      queue.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(queue.run(async () => 'ok')).resolves.toBe('ok');
  });
});

describe('getRateLimitDelayMs', () => {
  it('без Retry-After пауза удваивается', () => {
    expect(getRateLimitDelayMs(0, null)).toBe(2000);
    expect(getRateLimitDelayMs(2, null)).toBe(8000);
  });

  it('Retry-After в секундах и в виде даты', () => {
    expect(getRateLimitDelayMs(0, '3')).toBe(3000);
    expect(
      getRateLimitDelayMs(
        0,
        'Thu, 01 Jan 2026 00:00:05 GMT',
        Date.UTC(2026, 0, 1),
      ),
    ).toBe(5000);
  });

  it('пауза ограничена сверху и не бывает отрицательной', () => {
    expect(getRateLimitDelayMs(10, null)).toBe(30000);
    expect(getRateLimitDelayMs(0, '600')).toBe(30000);
    expect(
      getRateLimitDelayMs(
        0,
        'Thu, 01 Jan 2026 00:00:00 GMT',
        Date.UTC(2026, 0, 2),
      ),
    ).toBe(0);
  });
});

describe('RateLimitCooldown', () => {
  it('продлевается, но не сокращается', () => {
    let now = 0;
    const cooldown = new RateLimitCooldown(() => now);

    cooldown.extend(5000);
    cooldown.extend(1000);
    expect(cooldown.remaining()).toBe(5000);

    now = 4000;
    expect(cooldown.remaining()).toBe(1000);
    now = 6000;
    expect(cooldown.remaining()).toBe(0);
  });
});

describe('withRateLimitRetry', () => {
  const limited = new Error('429');
  const inspect = (error: unknown) => ({ limited: error === limited });

  const createClock = () => {
    const clock = { now: 0, waits: [] as number[] };
    const cooldown = new RateLimitCooldown(() => clock.now);
    const wait = async (ms: number) => {
      clock.waits.push(ms);
      clock.now += ms;
    };
    return { clock, cooldown, wait };
  };

  it('после 429 ждёт общую паузу и возвращает успешный ответ', async () => {
    const { clock, cooldown, wait } = createClock();
    let calls = 0;

    const result = await withRateLimitRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw limited;
        return 'players';
      },
      inspect,
      { cooldown, wait },
    );

    expect(result).toBe('players');
    expect(clock.waits).toEqual([2000, 4000]);
  });

  it('запрос ждёт паузу, заданную другим запросом', async () => {
    const { clock, cooldown, wait } = createClock();
    cooldown.extend(30000);

    await withRateLimitRetry(async () => 'ok', inspect, { cooldown, wait });

    expect(clock.waits).toEqual([30000]);
  });

  it('прочие ошибки не повторяет', async () => {
    const { cooldown, wait } = createClock();
    const other = new Error('404');
    let calls = 0;

    await expect(
      withRateLimitRetry(
        async () => {
          calls += 1;
          throw other;
        },
        inspect,
        { cooldown, wait },
      ),
    ).rejects.toBe(other);
    expect(calls).toBe(1);
  });

  it('после исчерпания попыток пробрасывает 429', async () => {
    const { clock, cooldown, wait } = createClock();
    let calls = 0;

    await expect(
      withRateLimitRetry(
        async () => {
          calls += 1;
          throw limited;
        },
        inspect,
        { cooldown, wait },
      ),
    ).rejects.toBe(limited);
    expect(calls).toBe(7);
    expect(clock.waits.reduce((sum, ms) => sum + ms, 0)).toBe(
      2000 + 4000 + 8000 + 16000 + 30000 + 30000,
    );
  });
});
