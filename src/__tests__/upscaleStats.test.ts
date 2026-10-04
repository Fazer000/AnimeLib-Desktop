import {
  formatUpscaleStats,
  getFramesPerSecond,
} from '../renderer/utils/upscaleStats';

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
