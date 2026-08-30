/**
 * Логирование с областью видимости. В production полностью отключено.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface Logger {
  readonly debug: (...args: unknown[]) => void;
  readonly info: (...args: unknown[]) => void;
  readonly warn: (...args: unknown[]) => void;
  readonly error: (...args: unknown[]) => void;
}

const IS_DEV = process.env.NODE_ENV !== 'production';

const noop = (): void => {};

const SILENT: Logger = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

let threshold: LogLevel = 'debug';

/** Меняет порог логирования. Действует только в dev-сборке. */
export const setLogLevel = (level: LogLevel): void => {
  threshold = level;
};

/** Возвращает текущий порог логирования. */
export const getLogLevel = (): LogLevel => (IS_DEV ? threshold : 'silent');

const bind = (
  method: 'log' | 'info' | 'warn' | 'error',
  level: LogLevel,
  prefix: string,
): ((...args: unknown[]) => void) =>
  RANK[level] >= RANK[threshold]
    ? // eslint-disable-next-line no-console
      console[method].bind(console, prefix)
    : noop;

/** Создаёт логгер, добавляющий префикс области к каждому сообщению. */
export const createLogger = (scope: string): Logger => {
  if (!IS_DEV) {
    return SILENT;
  }

  const prefix = `[${scope}]`;

  return {
    get debug() {
      return bind('log', 'debug', prefix);
    },
    get info() {
      return bind('info', 'info', prefix);
    },
    get warn() {
      return bind('warn', 'warn', prefix);
    },
    get error() {
      return bind('error', 'error', prefix);
    },
  };
};
