import fs from 'fs';
import os from 'os';
import path from 'path';

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'animelib-crash-'));

jest.mock('electron', () => ({
  app: { getPath: () => userData, exit: jest.fn(), on: jest.fn() },
  dialog: { showMessageBoxSync: jest.fn() },
  ipcMain: { on: jest.fn() },
  BrowserWindow: class {},
}));

// eslint-disable-next-line import/first
import { getCrashLogPath, logCrash } from '../main/crashReporter';

const readLog = () => fs.readFileSync(getCrashLogPath(), 'utf8');

describe('logCrash', () => {
  beforeEach(() => {
    fs.rmSync(path.dirname(getCrashLogPath()), {
      recursive: true,
      force: true,
    });
  });

  it('создаёт папку и файл журнала при первой записи', () => {
    logCrash('test', new Error('первая'));

    expect(fs.existsSync(getCrashLogPath())).toBe(true);
  });

  it('пишет область, сообщение и стек', () => {
    logCrash('uncaughtException', new Error('всё сломалось'));

    const text = readLog();
    expect(text).toContain('uncaughtException');
    expect(text).toContain('всё сломалось');
    expect(text).toContain('at ');
  });

  it('дописывает записи, не затирая прошлые', () => {
    logCrash('первый', new Error('a'));
    logCrash('второй', new Error('b'));

    const text = readLog();
    expect(text).toContain('первый');
    expect(text).toContain('второй');
  });

  it('переваривает не-Error значения', () => {
    logCrash('unhandledRejection', { reason: 'отказ', code: 42 });
    logCrash('unhandledRejection', 'строка');

    const text = readLog();
    expect(text).toContain('отказ');
    expect(text).toContain('строка');
  });

  it('не бросает на значении, которое нельзя сериализовать', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    expect(() => logCrash('cyclic', cyclic)).not.toThrow();
    expect(fs.existsSync(getCrashLogPath())).toBe(true);
  });

  it('ротирует журнал, когда он перерос лимит', () => {
    const file = getCrashLogPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'x'.repeat(600 * 1024), 'utf8');

    logCrash('после переполнения', new Error('свежая'));

    expect(fs.existsSync(`${file}.1`)).toBe(true);
    expect(readLog()).toContain('свежая');
    expect(readLog().length).toBeLessThan(10 * 1024);
  });
});
