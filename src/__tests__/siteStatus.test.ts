import { CONNECTIVITY_PROBE_URL } from '../constants';
import { probeTarget, probeVerdict } from '../shared/siteStatus';

describe('probeVerdict', () => {
  it('ответ страницы, включая проверку браузера, — связь есть', () => {
    [200, 301, 302, 403, 404].forEach((code) =>
      expect(probeVerdict(code)).toEqual({ ok: true, reason: 'ok' }),
    );
  });

  it('ошибки сервера и прокси — сайт недоступен', () => {
    [0, 500, 502, 503, 504, 522, 530].forEach((code) =>
      expect(probeVerdict(code)).toEqual({ ok: false, reason: 'network' }),
    );
  });
});

describe('probeTarget', () => {
  it('зеркала AnimeLib проверяются как есть', () => {
    ['https://v5.animelib.org/', 'https://animelib.org/'].forEach((url) =>
      expect(probeTarget(url)).toBe(url),
    );
  });

  it('чужие, небезопасные и битые адреса заменяются адресом по умолчанию', () => {
    [
      'https://example.com/',
      'https://mangalib.me/',
      'https://anilib.me/',
      'http://animelib.org/',
      'https://animelib.org.evil.test/',
      'не адрес',
      undefined,
    ].forEach((url) => expect(probeTarget(url)).toBe(CONNECTIVITY_PROBE_URL));
  });
});
