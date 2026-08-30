import {
  buildAnimePageUrl,
  buildCommentUrl,
  getHomeUrl,
  getSiteOrigin,
  isSiteUrl,
  normalizeSiteUrl,
  saveSiteUrl,
} from '../renderer/utils/urlHelpers';

const DEFAULT_ORIGIN = 'https://v5.animelib.org';

describe('isSiteUrl', () => {
  it('принимает домен сайта и его поддомены', () => {
    expect(isSiteUrl('https://animelib.org/ru')).toBe(true);
    expect(isSiteUrl('https://v5.animelib.org/')).toBe(true);
    expect(isSiteUrl('https://anime.animelib.org/x')).toBe(true);
  });

  it('отклоняет чужие домены, в том числе похожие', () => {
    expect(isSiteUrl('https://example.com')).toBe(false);
    expect(isSiteUrl('https://notanimelib.org')).toBe(false);
    expect(isSiteUrl('https://animelib.org.evil.com')).toBe(false);
  });

  it('на мусоре вместо URL не бросает', () => {
    expect(isSiteUrl('не url')).toBe(false);
    expect(isSiteUrl('')).toBe(false);
  });
});

describe('normalizeSiteUrl', () => {
  it('оставляет только origin со слешем', () => {
    expect(normalizeSiteUrl('https://animelib.org/ru/anime/x?y=1')).toBe(
      'https://animelib.org/',
    );
  });

  it('чужой адрес подменяет на сайт по умолчанию', () => {
    expect(normalizeSiteUrl('https://example.com/page')).toBe(
      `${DEFAULT_ORIGIN}/`,
    );
  });
});

describe('getSiteOrigin', () => {
  beforeEach(() => localStorage.clear());

  it('берёт сохранённый адрес', () => {
    localStorage.setItem('animeLibUrl', 'https://v5.animelib.org/');

    expect(getSiteOrigin()).toBe(DEFAULT_ORIGIN);
  });

  it('без сохранённого адреса отдаёт значение по умолчанию', () => {
    expect(getSiteOrigin()).toBe(DEFAULT_ORIGIN);
  });

  it('игнорирует сохранённый чужой домен', () => {
    localStorage.setItem('animeLibUrl', 'https://evil.com/');

    expect(getSiteOrigin()).toBe(DEFAULT_ORIGIN);
  });
});

describe('saveSiteUrl', () => {
  beforeEach(() => localStorage.clear());

  it('сохраняет origin сайта и возвращает его', () => {
    const saved = saveSiteUrl('https://animelib.org/ru/anime/one');

    expect(saved).toBe('https://animelib.org/');
    expect(localStorage.getItem('animeLibUrl')).toBe('https://animelib.org/');
  });

  it('чужой адрес не сохраняет и отдаёт текущий домашний', () => {
    const saved = saveSiteUrl('https://evil.com/steal');

    expect(saved).toBe(getHomeUrl());
    expect(localStorage.getItem('animeLibUrl')).toBeNull();
  });
});

describe('построение ссылок', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('animeLibUrl', 'https://animelib.org/');
  });

  it('страница тайтла собирается из slug', () => {
    expect(buildAnimePageUrl('one-piece')).toBe(
      'https://animelib.org/ru/anime/one-piece',
    );
  });

  it('ссылка на комментарий несёт эпизод и id', () => {
    expect(buildCommentUrl('one-piece', 42, 777)).toBe(
      'https://animelib.org/ru/anime/one-piece/watch?episode=42&comment_id=777',
    );
  });
});
