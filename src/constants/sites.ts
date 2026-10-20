/**
 * Сайты сети Lib: у всех один API, сайт выбирается заголовком Site-Id
 */

export type LibSiteKind = 'anime' | 'manga' | 'ranobe';

/**
 * Сайт сети. home — главная; у AnimeLib её нет: адрес выбирает пользователь
 * (animelib.org, v5.animelib.org), и он берётся из настроек
 */
export interface LibSite {
  name: string;
  letter: string;
  siteId: number;
  kind: LibSiteKind;
  hosts: string[];
  home: string | null;
}

export const LIB_API_URL = 'https://api.cdnlibs.org/api';

export const LIB_SITES: LibSite[] = [
  {
    name: 'AnimeLIB',
    letter: 'A',
    siteId: 5,
    kind: 'anime',
    hosts: ['animelib.org', 'anilib.me'],
    home: null,
  },
  {
    name: 'MangaLIB',
    letter: 'M',
    siteId: 1,
    kind: 'manga',
    hosts: ['mangalib.me'],
    home: 'https://mangalib.me/',
  },
  {
    name: 'YaoiLIB',
    letter: 'Y',
    siteId: 2,
    kind: 'manga',
    hosts: ['shlib.life', 'slashlib.me'],
    home: 'https://v2.shlib.life/',
  },
  {
    name: 'RanobeLIB',
    letter: 'R',
    siteId: 3,
    kind: 'ranobe',
    hosts: ['ranobelib.me'],
    home: 'https://ranobelib.me/',
  },
  {
    name: 'HentaiLIB',
    letter: 'H',
    siteId: 4,
    kind: 'manga',
    hosts: ['hentailib.me'],
    home: 'https://hentailib.me/',
  },
];
