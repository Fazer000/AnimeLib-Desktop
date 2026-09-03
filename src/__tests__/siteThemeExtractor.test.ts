import {
  SITE_THEME_MARKER,
  parseSiteThemeMessage,
} from '../renderer/scripts/siteThemeExtractor';

describe('parseSiteThemeMessage', () => {
  const message = (value: string) => `${SITE_THEME_MARKER}${value}`;

  it('узнаёт три режима сайта', () => {
    expect(parseSiteThemeMessage(message('auto'))).toBe('system');
    expect(parseSiteThemeMessage(message('light'))).toBe('light');
    expect(parseSiteThemeMessage(message('dark'))).toBe('dark');
  });

  it('чужие сообщения консоли отбрасывает', () => {
    expect(parseSiteThemeMessage('обычный лог страницы')).toBeNull();
    expect(parseSiteThemeMessage('[animelib-auth]dark')).toBeNull();
  });

  it('маркер должен стоять в начале', () => {
    expect(parseSiteThemeMessage(`шум ${message('dark')}`)).toBeNull();
  });

  it('нестроковое сообщение отбрасывает', () => {
    expect(parseSiteThemeMessage(undefined)).toBeNull();
    expect(parseSiteThemeMessage(null)).toBeNull();
    expect(parseSiteThemeMessage(42)).toBeNull();
  });

  it('пустое значение после маркера считает системным', () => {
    expect(parseSiteThemeMessage(SITE_THEME_MARKER)).toBe('system');
  });

  it('неизвестное значение после маркера считает системным', () => {
    expect(parseSiteThemeMessage(message('sepia'))).toBe('system');
  });
});
