import { LIB_SITES } from '../constants';
import {
  chosenMirror,
  currentMirror,
  formatLatency,
  mirrorHost,
  pickMirror,
  readSiteMirrors,
  readStartSite,
  saveSiteMirror,
  saveStartSite,
  siteStatus,
} from '../renderer/utils/siteMirrors';
import {
  findLibSite,
  libSiteHomeUrl,
  libSitePageUrl,
  libTitlePageUrl,
} from '../renderer/utils/libSites';
import {
  failedPageHost,
  isPageLoaded,
  isSiteDownStatus,
} from '../renderer/utils/loadFailure';

const [anime, manga, yaoi] = LIB_SITES;
const A = 'https://a.test/';
const B = 'https://b.test/';
const C = 'https://c.test/';

beforeEach(() => localStorage.clear());

describe('pickMirror', () => {
  it('выбранное зеркало, пока оно не признано недоступным', () => {
    expect(pickMirror([A, B], { [A]: { status: 'ok' } }, B)).toBe(B);
    expect(pickMirror([A, B], { [B]: { status: 'fail' } }, B)).toBe(A);
  });

  it('без выбора — первое доступное, затем первое проверяемое', () => {
    expect(
      pickMirror([A, B, C], {
        [A]: { status: 'fail' },
        [B]: { status: 'checking' },
        [C]: { status: 'ok' },
      }),
    ).toBe(C);
    expect(pickMirror([A, B], { [A]: { status: 'fail' } })).toBe(B);
  });

  it('все недоступны — выбранное или первое', () => {
    const states = {
      [A]: { status: 'fail' },
      [B]: { status: 'fail' },
    } as const;
    expect(pickMirror([A, B], states, B)).toBe(B);
    expect(pickMirror([A, B], states)).toBe(A);
  });

  it('выбор не из списка игнорируется', () => {
    expect(pickMirror([A, B], {}, C)).toBe(A);
  });
});

describe('siteStatus', () => {
  it('доступен, если отвечает хоть одно зеркало', () => {
    expect(
      siteStatus([A, B], { [A]: { status: 'fail' }, [B]: { status: 'ok' } }),
    ).toBe('ok');
    expect(siteStatus([A, B], { [A]: { status: 'fail' } })).toBe('checking');
    expect(siteStatus([A], { [A]: { status: 'fail' } })).toBe('fail');
  });
});

describe('подписи', () => {
  it('время ответа в секундах с запятой', () => {
    expect(formatLatency(640)).toBe('0,6 с');
    expect(formatLatency(1260)).toBe('1,3 с');
    expect(formatLatency(5)).toBe('0,1 с');
  });

  it('хост зеркала', () => {
    expect(mirrorHost('https://v5.animelib.org/')).toBe('v5.animelib.org');
    expect(mirrorHost('не адрес')).toBe('не адрес');
  });
});

describe('выбор зеркала', () => {
  it('chosenMirror: выбранное из списка зеркал, иначе главная', () => {
    expect(chosenMirror(yaoi, { 2: 'https://slashlib.me/' })).toBe(
      'https://slashlib.me/',
    );
    expect(chosenMirror(yaoi, { 2: C })).toBe('https://v2.shlib.life/');
    expect(chosenMirror(manga, {})).toBe('https://mangalib.me/');
  });

  it('зеркало манги хранится отдельно, AnimeLib — в адресе сайта', () => {
    saveSiteMirror(yaoi, 'https://slashlib.me/');
    expect(readSiteMirrors()).toEqual({ 2: 'https://slashlib.me/' });
    expect(currentMirror(yaoi)).toBe('https://slashlib.me/');

    saveSiteMirror(anime, 'https://anilib.me/');
    expect(localStorage.getItem('animeLibUrl')).toBe('https://anilib.me/');
    expect(currentMirror(anime)).toBe('https://anilib.me/');
  });

  it('испорченная запись — пустой выбор', () => {
    localStorage.setItem('libSiteMirrors', '{oops');
    expect(readSiteMirrors()).toEqual({});
  });

  it('адреса страниц ведут на выбранное зеркало', () => {
    const homes = { 2: 'https://slashlib.me/' };
    expect(libSitePageUrl(2, '/ru/x', LIB_SITES, homes)).toBe(
      'https://slashlib.me/ru/x',
    );
    expect(libTitlePageUrl(2, '1--a', LIB_SITES, homes)).toBe(
      'https://slashlib.me/ru/manga/1--a',
    );
    expect(libSiteHomeUrl(yaoi, A, homes)).toBe('https://slashlib.me/');
    expect(libSiteHomeUrl(anime, A, homes)).toBe(A);
  });
});

describe('базовый сайт', () => {
  it('не выбран — null, выбранный читается обратно', () => {
    expect(readStartSite()).toBeNull();
    saveStartSite(manga);
    expect(readStartSite()).toBe(manga);
  });

  it('неизвестный Site-Id — null', () => {
    localStorage.setItem('libStartSite', '42');
    expect(readStartSite()).toBeNull();
  });
});

describe('failedPageHost', () => {
  it('хост основной страницы, которая не загрузилась', () => {
    expect(
      failedPageHost({
        errorCode: -105,
        validatedURL: 'https://anilib.me/ru',
        isMainFrame: true,
      }),
    ).toBe('anilib.me');
  });

  it('прерванный переход, фрейм и команды — не ошибка страницы', () => {
    expect(
      failedPageHost({ errorCode: -3, validatedURL: 'https://a.test/' }),
    ).toBeNull();
    expect(
      failedPageHost({
        errorCode: -105,
        validatedURL: 'https://a.test/',
        isMainFrame: false,
      }),
    ).toBeNull();
    expect(
      failedPageHost(
        { errorCode: -301, validatedURL: 'anime-lib-player://x' },
        ['anime-lib-player://'],
      ),
    ).toBeNull();
    expect(
      failedPageHost({ errorCode: -6, validatedURL: 'file:///x' }),
    ).toBeNull();
  });
});

describe('isSiteDownStatus', () => {
  it('сеть не ответила и ошибки прокси — сайт не открылся', () => {
    [0, 502, 504, 520, 525, 527, 530].forEach((code) =>
      expect(isSiteDownStatus(code)).toBe(true),
    );
  });

  it('обычные ответы и страницы проверки — открылся', () => {
    [200, 301, 403, 404, 500, 503].forEach((code) =>
      expect(isSiteDownStatus(code)).toBe(false),
    );
  });
});

describe('isPageLoaded', () => {
  it('страница открылась: обычный ответ или переход внутри страницы', () => {
    expect(isPageLoaded(200)).toBe(true);
    expect(isPageLoaded(404)).toBe(true);
    expect(isPageLoaded(undefined)).toBe(true);
  });

  it('сеть не ответила или ошибка прокси — не открылась', () => {
    expect(isPageLoaded(0)).toBe(false);
    expect(isPageLoaded(525)).toBe(false);
  });
});

describe('зеркала MangaLIB и RanobeLIB', () => {
  const ranobe = LIB_SITES[3];

  it('новые домены узнаются как свои сайты', () => {
    expect(findLibSite('mangalib.org')?.siteId).toBe(1);
    expect(findLibSite('v1.novelslib.me')?.siteId).toBe(3);
  });

  it('у обоих сайтов по два зеркала, основное первым', () => {
    expect(manga.mirrors).toEqual([
      'https://mangalib.me/',
      'https://mangalib.org/',
    ]);
    expect(ranobe.mirrors[0]).toBe('https://ranobelib.me/');
  });

  it('ссылки ведут на выбранное зеркало', () => {
    const homes = { 1: 'https://mangalib.org/', 3: 'https://v1.novelslib.me/' };
    expect(libTitlePageUrl(1, '1--a', LIB_SITES, homes)).toBe(
      'https://mangalib.org/ru/manga/1--a',
    );
    expect(libTitlePageUrl(3, '2--b', LIB_SITES, homes)).toBe(
      'https://v1.novelslib.me/ru/book/2--b',
    );
  });
});
