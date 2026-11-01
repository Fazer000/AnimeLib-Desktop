/**
 * Сайты сети Lib: у всех один API, сайт выбирается заголовком Site-Id
 */

export type LibSiteKind = 'anime' | 'manga' | 'ranobe';

/** Сайт сети; home — главная */
export interface LibSite {
  name: string;
  letter: string;
  siteId: number;
  kind: LibSiteKind;
  hosts: string[];
  home: string | null;
  mirrors: string[];
}

export const LIB_API_URL = 'https://api.cdnlibs.org/api';

/** Выбранные зеркала сайтов, кроме AnimeLib: { [siteId]: главная } */
export const LIB_SITE_MIRRORS_STORAGE_KEY = 'libSiteMirrors';

/** Site-Id базового сайта, с которого открывается приложение */
export const LIB_START_SITE_STORAGE_KEY = 'libStartSite';

/** Сколько ждать ответа зеркала при проверке доступности, мс */
export const MIRROR_CHECK_TIMEOUT = 6000;

export const LIB_SITES: LibSite[] = [
  {
    name: 'AnimeLIB',
    letter: 'A',
    siteId: 5,
    kind: 'anime',
    hosts: ['animelib.org'],
    home: null,
    mirrors: ['https://animelib.org/', 'https://v5.animelib.org/'],
  },
  {
    name: 'MangaLIB',
    letter: 'M',
    siteId: 1,
    kind: 'manga',
    hosts: ['mangalib.me', 'mangalib.org'],
    home: 'https://mangalib.me/',
    mirrors: ['https://mangalib.me/', 'https://mangalib.org/'],
  },
  {
    name: 'SlashLIB',
    letter: 'S',
    siteId: 2,
    kind: 'manga',
    hosts: ['shlib.life', 'slashlib.me'],
    home: 'https://v2.shlib.life/',
    mirrors: ['https://v2.shlib.life/', 'https://slashlib.me/'],
  },
  {
    name: 'RanobeLIB',
    letter: 'R',
    siteId: 3,
    kind: 'ranobe',
    hosts: ['ranobelib.me', 'novelslib.me'],
    home: 'https://ranobelib.me/',
    mirrors: ['https://ranobelib.me/', 'https://v1.novelslib.me/'],
  },
  {
    name: 'HentaiLIB',
    letter: 'H',
    siteId: 4,
    kind: 'manga',
    hosts: ['hentailib.me'],
    home: 'https://hentailib.me/',
    mirrors: ['https://hentailib.me/'],
  },
];
