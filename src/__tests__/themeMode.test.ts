import {
  DEFAULT_THEME_MODE,
  THEME_MODES,
  isThemeMode,
  normalizeThemeMode,
  resolveColorScheme,
} from '../renderer/theme/themeMode';

describe('normalizeThemeMode', () => {
  it('узнаёт три режима сайта', () => {
    expect(normalizeThemeMode('system')).toBe('system');
    expect(normalizeThemeMode('light')).toBe('light');
    expect(normalizeThemeMode('dark')).toBe('dark');
  });

  it('не зависит от регистра и пробелов', () => {
    expect(normalizeThemeMode('  DARK ')).toBe('dark');
    expect(normalizeThemeMode('Light')).toBe('light');
  });

  it('понимает синонимы', () => {
    expect(normalizeThemeMode('auto')).toBe('system');
    expect(normalizeThemeMode('night')).toBe('dark');
    expect(normalizeThemeMode('day')).toBe('light');
  });

  it('неизвестное значение считает системным', () => {
    expect(normalizeThemeMode('sepia')).toBe('system');
    expect(normalizeThemeMode('')).toBe('system');
  });

  it('нестроковое значение считает системным', () => {
    expect(normalizeThemeMode(undefined)).toBe('system');
    expect(normalizeThemeMode(null)).toBe('system');
    expect(normalizeThemeMode(1)).toBe('system');
    expect(normalizeThemeMode({ mode: 'dark' })).toBe('system');
  });
});

describe('resolveColorScheme', () => {
  it('явный режим системное предпочтение не переопределяет', () => {
    expect(resolveColorScheme('light', true)).toBe('light');
    expect(resolveColorScheme('dark', false)).toBe('dark');
  });

  it('системный режим идёт за предпочтением', () => {
    expect(resolveColorScheme('system', true)).toBe('dark');
    expect(resolveColorScheme('system', false)).toBe('light');
  });
});

describe('isThemeMode', () => {
  it('пропускает только три режима', () => {
    THEME_MODES.forEach((mode) => expect(isThemeMode(mode)).toBe(true));
  });

  it('отсеивает посторонние значения', () => {
    expect(isThemeMode('auto')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe('DEFAULT_THEME_MODE', () => {
  it('до ответа сайта приложение остаётся тёмным', () => {
    expect(DEFAULT_THEME_MODE).toBe('dark');
    expect(isThemeMode(DEFAULT_THEME_MODE)).toBe(true);
  });
});
