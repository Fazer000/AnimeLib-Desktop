import { buildTitleAction } from '../renderer/utils/titleAction';
import {
  findLibSite,
  findLibSiteByUrl,
  currentSiteHomeUrl,
  libSiteHomeUrl,
  libTitlePageUrl,
  libSitePageUrl,
  pickSearchSite,
} from '../renderer/utils/libSites';

const chapters = [
  { id: 10, volume: '1', number: '0.5' },
  { id: 11, volume: '1', number: '1' },
  { id: 12, volume: '2', number: '2' },
];

describe('buildTitleAction', () => {
  it('без закладки — «Начать читать» с первой главы', () => {
    expect(
      buildTitleAction({
        watch: false,
        slug: '206--one-piece',
        items: chapters,
        bookmarkItemId: null,
      }),
    ).toEqual({
      available: true,
      label: 'Начать читать',
      counter: '0 / 3',
      href: '/ru/206--one-piece/read/v1/c0.5',
    });
  });

  it('с закладкой — «Продолжить читать» с главы из закладки', () => {
    expect(
      buildTitleAction({
        watch: false,
        slug: '206--one-piece',
        items: chapters,
        bookmarkItemId: 12,
      }),
    ).toMatchObject({
      label: 'Продолжить читать',
      counter: '3 / 3',
      href: '/ru/206--one-piece/read/v2/c2',
    });
  });

  it('закладка на неизвестную главу — как без закладки', () => {
    expect(
      buildTitleAction({
        watch: false,
        slug: 's',
        items: chapters,
        bookmarkItemId: 99,
      }).label,
    ).toBe('Начать читать');
  });

  it('аниме ведёт в плеер', () => {
    expect(
      buildTitleAction({
        watch: true,
        slug: '14831--dorohedoro-anime',
        items: [{ id: 1 }, { id: 2 }],
        bookmarkItemId: 1,
      }),
    ).toEqual({
      available: true,
      label: 'Продолжить смотреть',
      counter: '1 / 2',
      href: '/ru/anime/14831--dorohedoro-anime/watch',
    });
  });

  it('без глав и серий кнопка недоступна', () => {
    expect(
      buildTitleAction({
        watch: false,
        slug: 's',
        items: [],
        bookmarkItemId: null,
      }),
    ).toEqual({
      available: false,
      label: 'Главы недоступны',
      counter: '',
      href: null,
    });
    expect(
      buildTitleAction({
        watch: true,
        slug: 's',
        items: [],
        bookmarkItemId: null,
      }).label,
    ).toBe('Серии недоступны');
  });
});

describe('buildTitleAction: id пользователя в ссылке', () => {
  it('ссылка на главу получает ?ui=, как у ссылок сайта', () => {
    expect(
      buildTitleAction({
        watch: false,
        slug: '1--a',
        items: [{ id: 7, volume: '1', number: '1' }],
        bookmarkItemId: null,
        userId: '42',
      }).href,
    ).toBe('/ru/1--a/read/v1/c1?ui=42');
  });

  it('без входа и у аниме параметра нет', () => {
    const base = { slug: '1--a', items: [{ id: 7 }], bookmarkItemId: null };
    expect(buildTitleAction({ ...base, watch: false, userId: null }).href).toBe(
      '/ru/1--a/read/v1/c1',
    );
    expect(buildTitleAction({ ...base, watch: true, userId: '42' }).href).toBe(
      '/ru/anime/1--a/watch',
    );
  });
});

describe('findLibSite', () => {
  it('узнаёт сайт по домену и поддомену', () => {
    expect(findLibSite('v5.animelib.org')?.siteId).toBe(5);
    expect(findLibSite('mangalib.me')?.siteId).toBe(1);
    expect(findLibSite('v2.shlib.life')?.siteId).toBe(2);
    expect(findLibSite('ranobelib.me')?.kind).toBe('ranobe');
    expect(findLibSite('HENTAILIB.ME')?.siteId).toBe(4);
  });

  it('чужой домен — null', () => {
    expect(findLibSite('example.com')).toBeNull();
    expect(findLibSite('notmangalib.me')).toBeNull();
  });
});

describe('findLibSiteByUrl', () => {
  it('узнаёт сайт по адресу страницы', () => {
    expect(findLibSiteByUrl('https://v2.shlib.life/ru/manga/1--a')?.name).toBe(
      'SlashLIB',
    );
    expect(findLibSiteByUrl('https://example.com/')).toBeNull();
    expect(findLibSiteByUrl('не адрес')).toBeNull();
  });
});

describe('libSiteHomeUrl', () => {
  it('у AnimeLib — адрес из настроек, у остальных — своя главная', () => {
    const anime = findLibSite('animelib.org');
    const manga = findLibSite('mangalib.me');

    expect(anime && libSiteHomeUrl(anime, 'https://v5.animelib.org/')).toBe(
      'https://v5.animelib.org/',
    );
    expect(manga && libSiteHomeUrl(manga, 'https://v5.animelib.org/')).toBe(
      'https://mangalib.me/',
    );
  });
});

describe('currentSiteHomeUrl', () => {
  const animeHome = 'https://v5.animelib.org/';

  it('на сайтах манги и ранобэ — главная того же домена', () => {
    expect(
      currentSiteHomeUrl(
        'https://mangalib.me/ru/manga/206--one-piece',
        animeHome,
      ),
    ).toBe('https://mangalib.me/');
    expect(
      currentSiteHomeUrl('https://slashlib.me/ru/manga/1--a', animeHome),
    ).toBe('https://slashlib.me/');
  });

  it('на AnimeLib и вне сети — главная из настроек', () => {
    expect(
      currentSiteHomeUrl('https://anilib.me/ru/anime/1--a', animeHome),
    ).toBe(animeHome);
    expect(currentSiteHomeUrl('https://example.com/', animeHome)).toBe(
      animeHome,
    );
    expect(currentSiteHomeUrl('', animeHome)).toBe(animeHome);
  });
});

describe('запасные домены', () => {
  it('узнаёт anilib.me и slashlib.me', () => {
    expect(findLibSite('anilib.me')?.siteId).toBe(5);
    expect(findLibSite('slashlib.me')?.siteId).toBe(2);
  });
});

describe('libTitlePageUrl', () => {
  it('манга и ранобэ — на своих сайтах и в своих разделах', () => {
    expect(libTitlePageUrl(1, '206--one-piece')).toBe(
      'https://mangalib.me/ru/manga/206--one-piece',
    );
    expect(libTitlePageUrl(3, '6712--high-school-dxd-novel')).toBe(
      'https://ranobelib.me/ru/book/6712--high-school-dxd-novel',
    );
    expect(libTitlePageUrl(2, '1--a')).toBe(
      'https://v2.shlib.life/ru/manga/1--a',
    );
  });

  it('аниме, неизвестный сайт и пустой slug — null', () => {
    expect(libTitlePageUrl(5, '1--a')).toBeNull();
    expect(libTitlePageUrl(6, '1--a')).toBeNull();
    expect(libTitlePageUrl(1, '')).toBeNull();
  });
});

describe('libSitePageUrl', () => {
  it('путь на сайте манги или ранобэ по Site-Id', () => {
    expect(libSitePageUrl(3, '/ru/x/read/v1/c2')).toBe(
      'https://ranobelib.me/ru/x/read/v1/c2',
    );
    expect(libSitePageUrl(2, '/ru/manga/1--a')).toBe(
      'https://v2.shlib.life/ru/manga/1--a',
    );
  });

  it('AnimeLib и неизвестный сайт — null', () => {
    expect(libSitePageUrl(5, '/ru/anime/1--a')).toBeNull();
    expect(libSitePageUrl(6, '/')).toBeNull();
  });
});

describe('pickSearchSite', () => {
  it('остаётся на текущем сайте, если там есть результаты', () => {
    expect(pickSearchSite({ 5: 2, 1: 10 }, 5)).toBe(5);
  });

  it('иначе первый сайт с результатами по порядку сайтов', () => {
    expect(pickSearchSite({ 5: 0, 1: 0, 2: 4, 3: 7 }, 5)).toBe(2);
    expect(pickSearchSite({ 1: 0, 3: 7, 5: 1 }, 1)).toBe(5);
  });

  it('ничего не найдено — текущий сайт', () => {
    expect(pickSearchSite({ 5: 0, 1: 0 }, 1)).toBe(1);
    expect(pickSearchSite({}, 3)).toBe(3);
  });
});
