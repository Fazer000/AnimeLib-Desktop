import {
  CachedFranchise,
  findCachedFranchise,
  freshMatches,
  putCachedFranchise,
  toCachedFranchise,
} from '../renderer/utils/franchiseCache';
import type { ShikimoriFranchise } from '../renderer/utils/shikimoriFranchise';

const franchise = (...ids: number[]): ShikimoriFranchise => ({
  current_id: ids[0],
  nodes: ids.map((id) => ({
    id,
    date: null,
    name: `Тайтл ${id}`,
    image_url: null,
    url: `/animes/${id}-t`,
    year: 2020,
    kind: 'TV Сериал',
  })),
  links: [],
});

const entry = (
  ids: number[],
  savedAt: number,
  matches: CachedFranchise['matches'] = {},
): CachedFranchise => ({ franchise: franchise(...ids), savedAt, matches });

const TTL = { found: 100, missing: 10 };

describe('findCachedFranchise', () => {
  it('находит франшизу по любому её тайтлу', () => {
    const entries = [entry([1, 2], 0), entry([5, 6], 0)];

    expect(findCachedFranchise(entries, 6)).toBe(entries[1]);
    expect(findCachedFranchise(entries, 9)).toBeNull();
  });
});

describe('freshMatches', () => {
  it('найденные живут дольше ненайденных', () => {
    const cached = entry([1, 2, 3], 0, {
      2: { slug: '2--t-anime', cover: 'c.jpg', checkedAt: 0 },
      3: { slug: null, cover: null, checkedAt: 0 },
    });

    expect([...freshMatches(cached, 5, TTL).keys()]).toEqual([2, 3]);
    expect([...freshMatches(cached, 50, TTL)]).toEqual([
      [2, { slug: '2--t-anime', cover: 'c.jpg' }],
    ]);
    expect(freshMatches(cached, 150, TTL).size).toBe(0);
  });
});

describe('toCachedFranchise', () => {
  it('не сохраняет недоступные без входа и тайтлы вне франшизы', () => {
    const saved = toCachedFranchise(
      franchise(1, 2, 3),
      new Map([
        [2, { slug: '2--t-anime', cover: null }],
        [3, { slug: null, cover: null, restricted: true }],
        [9, { slug: '9--x-anime', cover: null }],
      ]),
      null,
      40,
    );

    expect(saved.savedAt).toBe(40);
    expect(saved.matches).toEqual({
      2: { slug: '2--t-anime', cover: null, checkedAt: 40 },
    });
  });

  it('сохраняет время прежней проверки, если результат не изменился', () => {
    const previous = entry([1, 2], 0, {
      2: { slug: '2--t-anime', cover: null, checkedAt: 7 },
    });
    const saved = toCachedFranchise(
      franchise(1, 2),
      new Map([[2, { slug: '2--t-anime', cover: 'new.jpg' }]]),
      previous,
      40,
    );

    expect(saved.matches[2].checkedAt).toBe(7);
    expect(saved.matches[2].cover).toBe('new.jpg');
  });
});

describe('putCachedFranchise', () => {
  it('заменяет прежнюю запись той же франшизы', () => {
    const entries = [entry([1, 2], 1), entry([5], 2)];
    const next = putCachedFranchise(entries, entry([2, 3], 3), 10);

    expect(next.map((item) => item.savedAt)).toEqual([3, 2]);
  });

  it('при переполнении вытесняет давно сохранённые', () => {
    const entries = [entry([1], 1), entry([2], 2)];
    const next = putCachedFranchise(entries, entry([3], 3), 2);

    expect(next.map((item) => item.franchise.nodes[0].id)).toEqual([3, 2]);
  });
});
