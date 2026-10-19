import {
  ShikimoriFranchise,
  ShikimoriFranchiseNode,
  animelibSlugFromShikimoriUrl,
  buildShikimoriGraph,
  markGuestMiss,
  matchOrder,
  parseShikimoriId,
  shikimoriEdge,
  shikimoriKey,
  shikimoriReleaseDate,
  toAnimelibMatch,
} from '../renderer/utils/shikimoriFranchise';

const node = (
  id: number,
  kind: string,
  url: string,
  year: number | null = 2013,
  date: number | null = 1365282000,
): ShikimoriFranchiseNode => ({
  id,
  date,
  name: `Тайтл ${id}`,
  image_url: `https://shikimori.io/system/animes/x96/${id}.jpg`,
  url,
  year,
  kind,
});

const keyOf = (id: number) => `k${id}`;

describe('parseShikimoriId', () => {
  it('берёт id из ссылки на любом домене', () => {
    expect(parseShikimoriId('https://shikimori.one/animes/21')).toBe(21);
    expect(parseShikimoriId('https://shiki.one/animes/63293')).toBe(63293);
    expect(parseShikimoriId('https://shikimori.io/animes/z5114-x')).toBe(5114);
  });

  it('без ссылки — null', () => {
    expect(parseShikimoriId('')).toBeNull();
    expect(parseShikimoriId(null)).toBeNull();
    expect(parseShikimoriId('https://example.com')).toBeNull();
  });
});

describe('animelibSlugFromShikimoriUrl', () => {
  it('превращает адрес Shikimori в slug Animelib', () => {
    expect(animelibSlugFromShikimoriUrl('/animes/21-one-piece')).toBe(
      'one-piece-anime',
    );
    expect(
      animelibSlugFromShikimoriUrl(
        '/animes/59571-shingeki-no-kyojin-movie-kanketsu-hen-the-last-attack',
      ),
    ).toBe('shingeki-no-kyojin-movie-kanketsu-hen-the-last-attack-anime');
  });

  it('адрес без slug — null', () => {
    expect(animelibSlugFromShikimoriUrl('/animes/21')).toBeNull();
  });
});

describe('shikimoriReleaseDate', () => {
  it('переводит метку времени в дату по Москве', () => {
    expect(
      shikimoriReleaseDate(node(1, 'Фильм', '/animes/1-a', 2024, 1731013200)),
    ).toBe('2024-11-08');
  });

  it('у невышедшего тайтла даты нет', () => {
    expect(
      shikimoriReleaseDate(node(1, 'Фильм', '/animes/1-a', null, 1792436401)),
    ).toBeNull();
  });
});

describe('shikimoriEdge', () => {
  it('предыстория разворачивается в продолжение', () => {
    expect(
      shikimoriEdge({ source_id: 2, target_id: 1, relation: 'prequel' }, keyOf),
    ).toEqual({ from: 'k1', to: 'k2', label: 'Продолжение', sequel: true });
  });

  it('полная история — это обобщение в обратную сторону', () => {
    expect(
      shikimoriEdge(
        { source_id: 5, target_id: 1, relation: 'full_story' },
        keyOf,
      ),
    ).toEqual({ from: 'k1', to: 'k5', label: 'Обобщение', sequel: false });
  });

  it('неизвестная связь становится «Другое»', () => {
    expect(
      shikimoriEdge({ source_id: 1, target_id: 2, relation: 'new' }, keyOf)
        .label,
    ).toBe('Другое');
  });
});

describe('buildShikimoriGraph', () => {
  const franchise: ShikimoriFranchise = {
    current_id: 1,
    nodes: [
      node(1, 'TV Сериал', '/animes/1-show'),
      node(2, 'TV Сериал', '/animes/2-show-2'),
      node(3, 'Реклама', '/animes/3-ad'),
      { ...node(4, 'Фильм', '/animes/4-movie'), image_url: '/missing_x96.jpg' },
    ],
    links: [
      { source_id: 1, target_id: 2, relation: 'sequel' },
      { source_id: 2, target_id: 1, relation: 'prequel' },
      { source_id: 1, target_id: 3, relation: 'other' },
      { source_id: 1, target_id: 4, relation: 'side_story' },
      { source_id: 4, target_id: 1, relation: 'parent_story' },
    ],
  };
  const graph = buildShikimoriGraph(franchise, {
    id: 1,
    slug: '7--show-anime',
  });

  it('текущему тайтлу даёт его slug, остальным — ключ Shikimori', () => {
    expect([...graph.titles.keys()]).toEqual([
      '7--show-anime',
      shikimoriKey(2),
      shikimoriKey(4),
    ]);
    expect(graph.titles.get('7--show-anime')).toMatchObject({
      availability: 'available',
      link: '7--show-anime',
    });
    expect(graph.titles.get(shikimoriKey(2))).toMatchObject({
      availability: 'pending',
      link: null,
      lookupSlug: 'show-2-anime',
      shikimoriId: 2,
      releaseDate: '2013-04-07',
    });
  });

  it('отбрасывает рекламу и её связи, парные связи сводит в одну', () => {
    expect(graph.edges).toEqual([
      {
        from: '7--show-anime',
        to: shikimoriKey(2),
        label: 'Продолжение',
        sequel: true,
      },
      {
        from: '7--show-anime',
        to: shikimoriKey(4),
        label: 'Побочная история',
        sequel: false,
      },
    ]);
  });

  it('берёт slug и обложку найденных тайтлов, отмечает отсутствующие', () => {
    const matched = buildShikimoriGraph(
      franchise,
      { id: 1, slug: '7--show-anime' },
      new Map([
        [2, { slug: '8--show-2-anime', cover: 'animelib.jpg' }],
        [4, { slug: null, cover: null }],
      ]),
    );

    expect(matched.titles.get(shikimoriKey(2))).toMatchObject({
      availability: 'available',
      link: '8--show-2-anime',
      cover: 'animelib.jpg',
    });
    expect(matched.titles.get(shikimoriKey(4))).toMatchObject({
      availability: 'missing',
      link: null,
    });
  });

  it('текущим может быть любой тайтл франшизы', () => {
    const fromSequel = buildShikimoriGraph(franchise, {
      id: 2,
      slug: '8--show-2-anime',
    });

    expect(fromSequel.titles.has('8--show-2-anime')).toBe(true);
    expect(fromSequel.titles.get(shikimoriKey(1))?.availability).toBe(
      'pending',
    );
  });

  it('заглушку вместо обложки не показывает', () => {
    expect(graph.titles.get(shikimoriKey(4))?.cover).toBeNull();
  });
});

describe('matchOrder', () => {
  it('сначала ближние по году, невышедшие и реклама — отдельно', () => {
    const order = matchOrder(
      {
        current_id: 1,
        nodes: [
          node(1, 'TV Сериал', '/animes/1-a', 2013),
          node(2, 'Фильм', '/animes/2-b', 2020),
          node(3, 'OVA', '/animes/3-c', 2014),
          node(4, 'Фильм', '/animes/4-d', null),
          node(5, 'Реклама', '/animes/5-e', 2013),
        ],
        links: [],
      },
      1,
    );

    expect(order.map((item) => item.id)).toEqual([3, 2, 4]);
  });
});

describe('toAnimelibMatch', () => {
  const found = {
    slug_url: '12--one-piece-anime',
    shikimori_href: 'https://shikimori.one/animes/21',
    cover: { thumbnail: 'thumb.jpg', default: 'full.jpg' },
  };

  it('засчитывает тайтл с тем же id Shikimori', () => {
    expect(toAnimelibMatch(found, 21)).toEqual({
      slug: '12--one-piece-anime',
      cover: 'thumb.jpg',
    });
  });

  it('чужой или ненайденный тайтл — отсутствует', () => {
    expect(toAnimelibMatch(found, 22)).toEqual({ slug: null, cover: null });
    expect(toAnimelibMatch(null, 21)).toEqual({ slug: null, cover: null });
  });
});

describe('markGuestMiss', () => {
  const miss = { slug: null, cover: null };

  it('без входа ненайденный тайтл помечается как возможно скрытый', () => {
    expect(markGuestMiss(miss, false)).toEqual({ ...miss, restricted: true });
  });

  it('после входа или для найденного тайтла ничего не меняет', () => {
    expect(markGuestMiss(miss, true)).toEqual(miss);
    const found = { slug: '1--a-anime', cover: null };
    expect(markGuestMiss(found, false)).toBe(found);
  });
});

describe('buildShikimoriGraph и скрытые тайтлы', () => {
  it('ненайденный без входа тайтл — restricted', () => {
    const graph = buildShikimoriGraph(
      {
        current_id: 1,
        nodes: [
          node(1, 'TV Сериал', '/animes/1-a'),
          node(2, 'OVA', '/animes/2-b'),
        ],
        links: [{ source_id: 1, target_id: 2, relation: 'other' }],
      },
      { id: 1, slug: '1--a-anime' },
      new Map([[2, { slug: null, cover: null, restricted: true }]]),
    );

    expect(graph.titles.get(shikimoriKey(2))?.availability).toBe('restricted');
  });
});
