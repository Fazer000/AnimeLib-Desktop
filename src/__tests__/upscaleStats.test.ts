import {
  formatUpscaleStats,
  getFrameBudgetMs,
  getFramesPerSecond,
  isFrameInterval,
  isStatsWindowDue,
  isWarmupDone,
} from '../renderer/utils/upscaleStats';

describe('getFrameBudgetMs', () => {
  it('бюджет — интервал между кадрами видео: 24 к/с дают 41,7 мс', () => {
    expect(getFrameBudgetMs(1000 / 24)).toBeCloseTo(41.67, 1);
  });

  it('не меньше 60 Гц и без замеров тоже 60 Гц', () => {
    expect(getFrameBudgetMs(1000 / 120)).toBeCloseTo(16.67, 1);
    expect(getFrameBudgetMs(0)).toBeCloseTo(16.67, 1);
  });
});

describe('isFrameInterval', () => {
  it('паузы и перемотки в бюджет не идут', () => {
    expect(isFrameInterval(41.7)).toBe(true);
    expect(isFrameInterval(0)).toBe(false);
    expect(isFrameInterval(900)).toBe(false);
  });
});

describe('isWarmupDone', () => {
  it('заканчивается по числу кадров', () => {
    expect(isWarmupDone(0, 100)).toBe(true);
    expect(isWarmupDone(5, 100)).toBe(false);
  });

  it('на медленной видеокарте заканчивается по времени', () => {
    expect(isWarmupDone(12, 3000)).toBe(true);
  });
});

describe('isStatsWindowDue', () => {
  it('на быстрой видеокарте окно закрывается по кадрам', () => {
    expect(isStatsWindowDue(30, 500)).toBe(false);
    expect(isStatsWindowDue(31, 500)).toBe(true);
  });

  it('на медленной — по времени, хватает одного кадра', () => {
    expect(isStatsWindowDue(1, 1446)).toBe(false);
    expect(isStatsWindowDue(2, 2892)).toBe(true);
  });

  it('без кадров окно не закрывается', () => {
    expect(isStatsWindowDue(0, 5000)).toBe(false);
  });
});

describe('formatUpscaleStats', () => {
  it('собирает подпись из уровня, размеров, времени кадра и доли пропусков', () => {
    expect(
      formatUpscaleStats({
        preset: 'balanced',
        frameTimeMs: 2.84,
        overBudgetShare: 0.126,
        sourceSize: { width: 1920, height: 1080 },
        targetSize: { width: 2400, height: 1350 },
      }),
    ).toBe('Среднее · 1920×1080 → 2400×1350 · 2.8 мс · пропуски 13%');
  });

  it('при пропуске обработки объясняет причину', () => {
    expect(
      formatUpscaleStats({
        preset: 'quality',
        bypassed: true,
        frameTimeMs: 0,
        overBudgetShare: 0,
        sourceSize: { width: 3840, height: 2160 },
        targetSize: { width: 2560, height: 1440 },
      }),
    ).toBe('Максимальное · 3840×2160 → 2560×1440 · обработка не нужна');
  });
});

describe('getFramesPerSecond', () => {
  it('считает частоту по числу кадров и времени', () => {
    expect(getFramesPerSecond(30, 1250)).toBe(24);
    expect(getFramesPerSecond(30, 500)).toBe(60);
  });

  it('без прошедшего времени — ноль', () => {
    expect(getFramesPerSecond(30, 0)).toBe(0);
  });
});

describe('formatUpscaleStats с частотой', () => {
  it('добавляет кадры в секунду', () => {
    expect(
      formatUpscaleStats({
        preset: 'quality',
        framesPerSecond: 59.9,
        frameTimeMs: 7.24,
        overBudgetShare: 0,
        sourceSize: { width: 1920, height: 1080 },
        targetSize: { width: 2560, height: 1440 },
      }),
    ).toBe(
      'Максимальное · 1920×1080 → 2560×1440 · 60 к/с · 7.2 мс · пропуски 0%',
    );
  });
});
