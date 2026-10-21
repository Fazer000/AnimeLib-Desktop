import {
  buildSiteThemeWriteScript,
  toSiteThemeName,
  SITE_THEME_MARKER,
  parseSiteThemeMessage,
  siteThemeWatcherScript,
  buildReaderThemeWriteScript,
  isReaderUrl,
  readerThemeFor,
  siteThemeScript,
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

describe('toSiteThemeName', () => {
  it('системный режим на сайте называется auto', () => {
    expect(toSiteThemeName('system')).toBe('auto');
    expect(toSiteThemeName('light')).toBe('light');
    expect(toSiteThemeName('dark')).toBe('dark');
  });
});

describe('buildSiteThemeWriteScript', () => {
  it('пишет тему в настройки сайта и сообщает об этом событием storage', () => {
    const script = buildSiteThemeWriteScript('light');

    expect(script).toContain('{ name: "light" }');
    expect(script).toContain("localStorage.setItem('settings', newValue)");
    expect(script).toContain("new StorageEvent('storage'");
  });
});

describe('siteThemeWatcherScript', () => {
  it('сообщает только о смене атрибута темы, не о теме при загрузке', () => {
    expect(siteThemeWatcherScript).toContain('MutationObserver');
    expect(siteThemeWatcherScript).not.toMatch(/\n\s*report\(\);/);
    expect(siteThemeWatcherScript).not.toContain("addEventListener('storage'");
  });
});

/** Выполняет скрипт страницы так же, как executeJavaScript */
// eslint-disable-next-line no-eval
const runPageScript = (code: string) => eval(code);

describe('тема читалки', () => {
  beforeEach(() => localStorage.clear());

  it('узнаёт страницу читалки', () => {
    expect(isReaderUrl('https://mangalib.me/ru/1--a/read/v1/c1')).toBe(true);
    expect(isReaderUrl('https://mangalib.me/ru/manga/1--a')).toBe(false);
    expect(isReaderUrl('не адрес')).toBe(false);
  });

  it('манга получает режим приложения, ранобэ — пресет по схеме', () => {
    expect(readerThemeFor('manga', 'system', 'dark')).toEqual({ name: 'auto' });
    expect(readerThemeFor('manga', 'light', 'light')).toEqual({
      name: 'light',
    });
    expect(readerThemeFor('ranobe', 'system', 'dark')).toEqual({
      name: 'dark',
      color: { text: '#dddddd', background: '#141414' },
    });
    expect(readerThemeFor('ranobe', 'light', 'light').name).toBe('light');
  });

  it('запись меняет только тему читалки, остальные настройки сохраняются', () => {
    localStorage.setItem(
      'settings',
      JSON.stringify({
        theme: { name: 'light' },
        reader: {
          fontSize: 18,
          theme: { name: 'custom', color: { text: '#1', background: '#2' } },
        },
      }),
    );
    let events = 0;
    window.addEventListener('storage', () => {
      events += 1;
    });

    expect(
      runPageScript(
        buildReaderThemeWriteScript(readerThemeFor('ranobe', 'dark', 'dark')),
      ),
    ).toBe(true);
    const settings = JSON.parse(localStorage.getItem('settings')!);
    expect(settings.theme).toEqual({ name: 'light' });
    expect(settings.reader.fontSize).toBe(18);
    expect(settings.reader.theme).toEqual({
      name: 'dark',
      color: { text: '#dddddd', background: '#141414' },
    });
    expect(events).toBe(1);
  });

  it('тема сайта читается из настроек раньше атрибута читалки', () => {
    localStorage.setItem(
      'settings',
      JSON.stringify({ theme: { name: 'light' } }),
    );
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(runPageScript(siteThemeScript)).toBe('light');
    document.documentElement.removeAttribute('data-theme');
  });

  it('наблюдатель молчит в читалке', () => {
    expect(siteThemeWatcherScript).toContain("indexOf('/read/')");
  });
});
