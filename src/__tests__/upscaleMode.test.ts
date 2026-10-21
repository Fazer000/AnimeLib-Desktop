import {
  evaluateAutoWindow,
  formatUpscaleSummary,
  getLowerPreset,
  getStartPreset,
  getUpscaleModeDescription,
  getUpscaleModeLabel,
  isHardwareAdapter,
  isUpscaleMode,
  isUpscalePreset,
} from '../renderer/utils/upscaleMode';

const BUDGET = 1000 / 60;

describe('isHardwareAdapter', () => {
  it('отвергает отсутствующий и программный адаптер', () => {
    expect(isHardwareAdapter(null)).toBe(false);
    expect(isHardwareAdapter({ isFallbackAdapter: true })).toBe(false);
    expect(isHardwareAdapter({ info: { isFallbackAdapter: true } })).toBe(
      false,
    );
  });

  it('принимает аппаратный адаптер, даже без поля isFallbackAdapter', () => {
    expect(isHardwareAdapter({ isFallbackAdapter: false })).toBe(true);
    expect(isHardwareAdapter({})).toBe(true);
  });
});

describe('isUpscaleMode и isUpscalePreset', () => {
  it('принимают только известные значения', () => {
    expect(isUpscaleMode('auto')).toBe(true);
    expect(isUpscaleMode('off')).toBe(true);
    expect(isUpscaleMode('ultra')).toBe(false);
    expect(isUpscaleMode(null)).toBe(false);
    expect(isUpscalePreset('balanced')).toBe(true);
    expect(isUpscalePreset('auto')).toBe(false);
  });
});

describe('getStartPreset', () => {
  it('выключено — без обработки', () => {
    expect(getStartPreset('off', 'fast')).toBeNull();
  });

  it('выбранный уровень используется как есть', () => {
    expect(getStartPreset('balanced', 'fast')).toBe('balanced');
  });

  it('«Авто» продолжает с найденного уровня, иначе с максимального', () => {
    expect(getStartPreset('auto', 'fast')).toBe('fast');
    expect(getStartPreset('auto', null)).toBe('quality');
  });
});

describe('getLowerPreset', () => {
  it('понижает на ступень, с лёгкого — некуда', () => {
    expect(getLowerPreset('quality')).toBe('balanced');
    expect(getLowerPreset('balanced')).toBe('fast');
    expect(getLowerPreset('fast')).toBeNull();
  });
});

describe('evaluateAutoWindow', () => {
  it('хорошее окно сбрасывает счётчик', () => {
    expect(
      evaluateAutoWindow({ frameTimeMs: 4, overBudgetShare: 0 }, 1, BUDGET),
    ).toEqual({ badWindows: 0, stepDown: false });
  });

  it('медленное окно копится, второе подряд понижает', () => {
    const slow = { frameTimeMs: 15, overBudgetShare: 0 };

    expect(evaluateAutoWindow(slow, 0, BUDGET)).toEqual({
      badWindows: 1,
      stepDown: false,
    });
    expect(evaluateAutoWindow(slow, 1, BUDGET)).toEqual({
      badWindows: 0,
      stepDown: true,
    });
  });

  it('частые просрочки плохи даже при нормальном среднем', () => {
    expect(
      evaluateAutoWindow({ frameTimeMs: 6, overBudgetShare: 0.2 }, 0, BUDGET)
        .badWindows,
    ).toBe(1);
  });
});

describe('подписи режимов', () => {
  it('понятные названия и пояснения', () => {
    expect(getUpscaleModeLabel('balanced')).toBe('Среднее');
    expect(getUpscaleModeDescription('fast')).toBe(
      'Немного чётче, низкая нагрузка',
    );
  });

  it('сводка на главной странице меню', () => {
    expect(formatUpscaleSummary('off', null, false)).toBe('Выключено');
    expect(formatUpscaleSummary('auto', 'balanced', false)).toBe(
      'Авто · Среднее',
    );
    expect(formatUpscaleSummary('quality', 'quality', false)).toBe(
      'Максимальное',
    );
    expect(formatUpscaleSummary('auto', 'fast', true)).toBe(
      'Не удалось включить',
    );
  });
});
