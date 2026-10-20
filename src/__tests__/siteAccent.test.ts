import {
  deriveSiteAccent,
  hexToRgb,
  mixHex,
} from '../renderer/theme/siteAccent';
import { getSchemeColors } from '../renderer/theme/appTheme';

describe('hexToRgb и mixHex', () => {
  it('разбирает полную и короткую запись', () => {
    expect(hexToRgb('#FF9100')).toEqual([255, 145, 0]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('смешивает цвета по доле второго', () => {
    expect(mixHex('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixHex('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });
});

describe('deriveSiteAccent', () => {
  it('тёмная схема: заливка — цвет сайта, текст осветлён, шапка общая', () => {
    const accent = deriveSiteAccent('#FF9100', 'dark');
    expect(accent.fill).toBe('#FF9100');
    expect(accent.soft).toBe(mixHex('#FF9100', '#FFFFFF', 0.42));
    expect(accent.rgb).toBe('255, 145, 0');
    expect(accent.quiet).toBe('rgba(255, 145, 0, 0.18)');
    expect(accent.header).toBeNull();
  });

  it('светлая схема: текст затемнён, шапка — разбавленный цвет сайта', () => {
    const accent = deriveSiteAccent('#2196F3', 'light');
    expect(accent.soft).toBe(mixHex('#2196F3', '#000000', 0.22));
    expect(accent.header).toBe(mixHex('#2196F3', '#FFFFFF', 0.88));
    expect(accent.headerRgb).toBe(hexToRgb(accent.header!).join(', '));
    expect(accent.quiet).toBe('rgba(33, 150, 243, 0.1)');
  });
});

describe('getSchemeColors по сайту', () => {
  it('AnimeLib и без сайта — прежняя фиолетовая тема', () => {
    expect(getSchemeColors('dark', 5)).toBe(getSchemeColors('dark'));
    expect(getSchemeColors('light', 42)).toBe(getSchemeColors('light'));
  });

  it('MangaLIB: акценты оранжевые, фоны прежние', () => {
    const base = getSchemeColors('light');
    const manga = getSchemeColors('light', 1);
    expect(manga.secondaryColor).toBe('#FF9100');
    expect(manga.accentRgb).toBe('255, 145, 0');
    expect(manga.siteHeaderColor).toBe(mixHex('#FF9100', '#FFFFFF', 0.88));
    expect(manga.pageColor).toBe(base.pageColor);
    expect(manga.dialogColor).toBe(base.dialogColor);
  });

  it('в тёмной схеме шапка не меняется', () => {
    expect(getSchemeColors('dark', 3).siteHeaderColor).toBe(
      getSchemeColors('dark').siteHeaderColor,
    );
  });
});
