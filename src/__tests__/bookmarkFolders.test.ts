import {
  filterAnimeFolders,
  resolveProgressStatus,
} from '../renderer/utils/bookmarkFolders';

describe('filterAnimeFolders', () => {
  it('оставляет только папки аниме в порядке сервера', () => {
    const folders = [
      { id: 1, site_ids: [0, 1, 2, 3, 4] },
      { id: 21, site_ids: [5] },
      { id: 22, site_ids: [5] },
      { id: 100, site_ids: [1, 5] },
    ];

    expect(filterAnimeFolders(folders).map((folder) => folder.id)).toEqual([
      21, 22, 100,
    ]);
  });

  it('папки без site_ids и пустой ответ дают пустой список', () => {
    expect(filterAnimeFolders([{ id: 7 }, { id: 8, site_ids: null }])).toEqual(
      [],
    );
    expect(filterAnimeFolders(null)).toEqual([]);
  });
});

describe('resolveProgressStatus', () => {
  it('прогресс остаётся в текущей папке', () => {
    expect(resolveProgressStatus(26)).toBe(26);
  });

  it('без закладки прогресс уходит в «Смотрю»', () => {
    expect(resolveProgressStatus(null)).toBe(21);
    expect(resolveProgressStatus(undefined)).toBe(21);
  });
});
