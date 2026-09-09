import { ConnectivityMonitor } from '../renderer/services/connectivity/ConnectivityMonitor';
import type { ConnectivityProbeResult } from '../constants';

const OK: ConnectivityProbeResult = { ok: true, reason: 'ok' };
const NETWORK: ConnectivityProbeResult = { ok: false, reason: 'network' };
const TIMEOUT: ConnectivityProbeResult = { ok: false, reason: 'timeout' };

/**
 * Создаёт монитор с управляемыми часами и подставной пробой
 */
function createMonitor(results: ConnectivityProbeResult[]) {
  let time = 1000;
  const probe = jest.fn(async () => results.shift() ?? OK);

  const monitor = new ConnectivityMonitor({
    probe,
    isInterfaceOnline: () => true,
    now: () => time,
    ttlMs: 10000,
    fastDeadlineMs: 3000,
    timeoutFailures: 2,
  });

  return {
    monitor,
    probe,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe('ConnectivityMonitor', () => {
  it('без сетевого интерфейса не опрашивает сайт', async () => {
    const probe = jest.fn(async () => OK);
    const monitor = new ConnectivityMonitor({
      probe,
      isInterfaceOnline: () => false,
    });

    await expect(monitor.check()).resolves.toBe(false);
    await expect(monitor.checkFast()).resolves.toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it('в пределах TTL отдаёт кэш без новой пробы', async () => {
    const { monitor, probe, advance } = createMonitor([OK]);

    await monitor.check();
    advance(9000);

    await expect(monitor.check()).resolves.toBe(true);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('после истечения TTL опрашивает заново', async () => {
    const { monitor, probe, advance } = createMonitor([OK, NETWORK]);

    await monitor.check();
    advance(10000);

    await expect(monitor.check()).resolves.toBe(false);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('объединяет параллельные вызовы в одну пробу', async () => {
    const { monitor, probe } = createMonitor([OK]);

    const results = await Promise.all([monitor.check(), monitor.check()]);

    expect(results).toEqual([true, true]);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('по ошибке сети уходит в оффлайн сразу', async () => {
    const { monitor } = createMonitor([NETWORK]);

    await expect(monitor.check()).resolves.toBe(false);
    expect(monitor.getStatus()).toBe(false);
  });

  it('одиночный таймаут не роняет известный онлайн-статус', async () => {
    const { monitor, probe, advance } = createMonitor([OK, TIMEOUT]);

    await monitor.check();
    advance(10000);

    await expect(monitor.check()).resolves.toBe(true);

    await expect(monitor.check()).resolves.toBe(true);
    expect(probe).toHaveBeenCalledTimes(3);
  });

  it('второй таймаут подряд переводит в оффлайн', async () => {
    const { monitor, advance } = createMonitor([OK, TIMEOUT, TIMEOUT]);

    await monitor.check();
    advance(10000);
    await monitor.check();

    await expect(monitor.check()).resolves.toBe(false);
  });

  it('успешная проба сбрасывает счётчик таймаутов', async () => {
    const { monitor, advance } = createMonitor([OK, TIMEOUT, OK, TIMEOUT]);

    await monitor.check();
    advance(10000);
    await monitor.check();
    advance(10000);
    await monitor.check();
    advance(10000);

    await expect(monitor.check()).resolves.toBe(true);
  });

  it('при неизвестном статусе таймаут считает связь потерянной', async () => {
    const { monitor } = createMonitor([TIMEOUT]);

    await expect(monitor.check()).resolves.toBe(false);
  });

  it('markOffline фиксирует оффлайн, invalidate заставляет перепроверить', async () => {
    const { monitor, probe } = createMonitor([OK]);

    monitor.markOffline();
    await expect(monitor.check()).resolves.toBe(false);
    expect(probe).not.toHaveBeenCalled();

    monitor.invalidate();
    await expect(monitor.check()).resolves.toBe(true);
  });
});

describe('ConnectivityMonitor.checkFast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('не ждёт медленную пробу дольше дедлайна', async () => {
    let release: (result: ConnectivityProbeResult) => void = () => {};
    const probe = jest.fn(
      () =>
        new Promise<ConnectivityProbeResult>((resolve) => {
          release = resolve;
        }),
    );

    const monitor = new ConnectivityMonitor({
      probe,
      isInterfaceOnline: () => true,
      fastDeadlineMs: 3000,
    });

    const fast = monitor.checkFast();

    jest.advanceTimersByTime(3000);
    await expect(fast).resolves.toBe(false);

    release(OK);
    await Promise.resolve();
    await Promise.resolve();

    expect(monitor.getStatus()).toBe(true);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('быстрый ответ отдаёт без ожидания дедлайна', async () => {
    const monitor = new ConnectivityMonitor({
      probe: async () => OK,
      isInterfaceOnline: () => true,
      fastDeadlineMs: 3000,
    });

    await expect(monitor.checkFast()).resolves.toBe(true);
  });
});
