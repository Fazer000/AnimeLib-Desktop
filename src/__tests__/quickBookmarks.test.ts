import type { BookmarkListItem } from '../renderer/api/animeApi';
import { mergeBookmarkLists } from '../renderer/utils/quickBookmarks';

const item = (slug: string, updatedAt?: string): BookmarkListItem => ({
  media: { slug_url: slug },
  updated_at: updatedAt,
});

const slugs = (items: BookmarkListItem[]) =>
  items.map((entry) => entry.media.slug_url);

describe('mergeBookmarkLists', () => {
  it('перемешивает папки по свежести обновления', () => {
    const watching = [
      item('a', '2026-10-18T10:00:00Z'),
      item('b', '2026-10-10T10:00:00Z'),
    ];
    const rewatching = [item('c', '2026-10-15T10:00:00Z')];

    expect(slugs(mergeBookmarkLists([watching, rewatching], 10))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('один тайтл попадает в список один раз — более свежей записью', () => {
    const merged = mergeBookmarkLists(
      [
        [item('a', '2026-10-01T00:00:00Z')],
        [item('a', '2026-10-05T00:00:00Z')],
      ],
      10,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].updated_at).toBe('2026-10-05T00:00:00Z');
  });

  it('обрезает общий список до лимита', () => {
    const lists = [
      [item('a', '2026-10-03'), item('b', '2026-10-01')],
      [item('c', '2026-10-02')],
    ];

    expect(slugs(mergeBookmarkLists(lists, 2))).toEqual(['a', 'c']);
  });

  it('записи без адреса тайтла и без даты не ломают список', () => {
    const broken = { media: {} } as BookmarkListItem;
    const lists = [[broken, item('a')], [item('b', '2026-10-01')]];

    expect(slugs(mergeBookmarkLists(lists, 10))).toEqual(['b', 'a']);
  });

  it('пустые папки дают пустой список', () => {
    expect(mergeBookmarkLists([[], []], 10)).toEqual([]);
  });
});
