import {
  FRANCHISE_ANIMELIB_CACHE_STORAGE_KEY,
  FRANCHISE_CACHE_STORAGE_KEY,
  FRANCHISE_CACHE_TTL_MS,
} from '../constants';
import type { FranchiseState } from '../renderer/services/franchise/franchiseLoader';

jest.mock('../renderer/api/animeApi', () => ({
  animeApi: {
    findAnime: jest.fn(),
    getAnimeRelease: jest.fn(),
    getRelatedAnime: jest.fn(),
    searchAnime: jest.fn(),
    isAuthorized: () => true,
  },
}));

jest.mock('../renderer/api/shikimoriApi', () => ({
  shikimoriApi: { getFranchise: jest.fn() },
}));

const slug = 'bleach-anime';
const shikimoriId = 269;
const sequelId = 41467;
const sequelSlug = 'bleach-sennen-kessen-hen-anime';
const franchise = {
  current_id: shikimoriId,
  nodes: [
    {
      id: shikimoriId,
      name: 'Блич',
      url: '/animes/269-bleach',
      kind: 'TV Сериал',
      year: 2004,
      date: null,
      image_url: null,
    },
    {
      id: sequelId,
      name: 'Блич: Тысячелетняя кровавая война',
      url: `/animes/${sequelId}-bleach-sennen-kessen-hen`,
      kind: 'TV Сериал',
      year: 2022,
      date: null,
      image_url: null,
    },
  ],
  links: [{ source_id: shikimoriId, target_id: sequelId, relation: 'sequel' }],
};

const getAnimeApi = () =>
  jest.requireMock<typeof import('../renderer/api/animeApi')>(
    '../renderer/api/animeApi',
  ).animeApi;

const getShikimoriApi = () =>
  jest.requireMock<typeof import('../renderer/api/shikimoriApi')>(
    '../renderer/api/shikimoriApi',
  ).shikimoriApi;

const getLoader = () =>
  jest.requireActual<
    typeof import('../renderer/services/franchise/franchiseLoader')
  >('../renderer/services/franchise/franchiseLoader');

function openFranchise(id: number | null) {
  const { subscribeFranchise } = getLoader();
  return new Promise<FranchiseState>((resolve) => {
    subscribeFranchise(slug, id, (state) => {
      if (state.done) resolve(state);
    });
  });
}

describe('Дисковый кэш хронологии', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('сохраняет «Блич» до завершения загрузки и читает после перезапуска без запросов', async () => {
    const animeApi = getAnimeApi();
    const shikimoriApi = getShikimoriApi();
    jest.mocked(shikimoriApi.getFranchise).mockResolvedValue(franchise);
    jest.mocked(animeApi.findAnime).mockResolvedValue({
      slug_url: sequelSlug,
      shikimori_href: `https://shikimori.io/animes/${sequelId}`,
    } as Awaited<ReturnType<typeof animeApi.findAnime>>);

    const first = await openFranchise(shikimoriId);
    expect(first.shikimori?.matches.get(sequelId)?.slug).toBe(sequelSlug);
    expect(localStorage.getItem(FRANCHISE_CACHE_STORAGE_KEY)).not.toBeNull();
    expect(shikimoriApi.getFranchise).toHaveBeenCalledTimes(1);

    jest.resetModules();
    const animeApiAfterRestart = getAnimeApi();
    const shikimoriApiAfterRestart = getShikimoriApi();
    const { hasFranchiseData, subscribeFranchise } = getLoader();
    expect(hasFranchiseData(slug, shikimoriId)).toBe(true);
    const listener = jest.fn();
    const unsubscribe = subscribeFranchise(slug, shikimoriId, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(first);
    expect(shikimoriApiAfterRestart.getFranchise).not.toHaveBeenCalled();
    expect(animeApiAfterRestart.findAnime).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('обновляет франшизу и время неизменившегося соответствия по истечении недели', async () => {
    const expired = Date.now() - FRANCHISE_CACHE_TTL_MS;
    localStorage.setItem(
      FRANCHISE_CACHE_STORAGE_KEY,
      JSON.stringify([
        {
          franchise,
          savedAt: expired,
          matches: {
            [sequelId]: { slug: sequelSlug, cover: null, checkedAt: expired },
          },
        },
      ]),
    );
    const animeApi = getAnimeApi();
    const shikimoriApi = getShikimoriApi();
    jest.mocked(shikimoriApi.getFranchise).mockResolvedValue(franchise);
    jest.mocked(animeApi.findAnime).mockResolvedValue({
      slug_url: sequelSlug,
      shikimori_href: `https://shikimori.io/animes/${sequelId}`,
    } as Awaited<ReturnType<typeof animeApi.findAnime>>);
    await openFranchise(shikimoriId);

    const { loadCachedFranchise } = jest.requireActual<
      typeof import('../renderer/services/franchise/franchiseStore')
    >('../renderer/services/franchise/franchiseStore');
    const cached = loadCachedFranchise(shikimoriId);
    expect(shikimoriApi.getFranchise).toHaveBeenCalledTimes(1);
    expect(animeApi.findAnime).toHaveBeenCalledTimes(1);
    expect(cached?.savedAt).toBeGreaterThan(expired);
    expect(cached?.matches[sequelId].checkedAt).toBeGreaterThan(expired);
  });

  it('читает резервный граф AnimeLib после перезапуска', async () => {
    const animeApi = getAnimeApi();
    jest.mocked(animeApi.getRelatedAnime).mockResolvedValue({ data: [] });
    jest.mocked(animeApi.getAnimeRelease).mockResolvedValue({
      name: 'Bleach',
      rus_name: 'Блич',
    } as Awaited<ReturnType<typeof animeApi.getAnimeRelease>>);
    const first = await openFranchise(null);
    expect(first.graph?.titles.get(slug)?.name).toBe('Блич');
    expect(
      localStorage.getItem(FRANCHISE_ANIMELIB_CACHE_STORAGE_KEY),
    ).not.toBeNull();

    jest.resetModules();
    const animeApiAfterRestart = getAnimeApi();
    const second = await openFranchise(null);
    expect(second).toEqual(first);
    expect(animeApiAfterRestart.getAnimeRelease).not.toHaveBeenCalled();
    expect(animeApiAfterRestart.getRelatedAnime).not.toHaveBeenCalled();
  });
});
