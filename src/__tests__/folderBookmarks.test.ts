import {
  formatFolderAnimeLabel,
  getFolderLabel,
  getFolderStatus,
  toAnimeBookmarkItems,
} from '../renderer/utils/folderBookmarks';

describe('getFolderStatus', () => {
  it('у аниме свои номера папок', () => {
    expect(getFolderStatus('anime', 'planned')).toBe(22);
    expect(getFolderStatus('anime', 'favorites')).toBe(25);
  });

  it('у манги и ранобэ — «В планах» и «Любимые»', () => {
    expect(getFolderStatus('manga', 'planned')).toBe(2);
    expect(getFolderStatus('manga', 'favorites')).toBe(5);
    expect(getFolderStatus('ranobe', 'planned')).toBe(2);
    expect(getFolderStatus('ranobe', 'favorites')).toBe(5);
  });
});

describe('toAnimeBookmarkItems', () => {
  it('берёт адрес, название, серию и обложку', () => {
    expect(
      toAnimeBookmarkItems([
        {
          media: {
            slug_url: '1--a',
            name: 'A',
            rus_name: 'А',
            cover: { thumbnail: 'c.jpg' },
          },
          item: { number: '3' },
        },
      ]),
    ).toEqual([
      {
        animeSlugUrl: '1--a',
        title: 'А',
        episodeNumber: '3',
        coverUrl: 'c.jpg',
      },
    ]);
  });

  it('серия из meta, если item нет; записи без адреса пропускает', () => {
    const items = toAnimeBookmarkItems([
      { media: { slug_url: '2--b', name: 'B' }, meta: { item_number: 7 } },
      { media: { name: 'без адреса' } },
      null,
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].episodeNumber).toBe('7');
    expect(items[0].coverUrl).toBeNull();
  });

  it('у не начатого тайтла серии нет', () => {
    expect(
      toAnimeBookmarkItems([{ media: { slug_url: '3--c' } }])[0].episodeNumber,
    ).toBe('');
  });
});

describe('подписи папок', () => {
  it('без серии — «Начать просмотр», с серией — продолжение', () => {
    expect(formatFolderAnimeLabel('')).toBe('Начать просмотр');
    expect(formatFolderAnimeLabel('3')).toBe('Продолжить · 3 эпизод');
  });

  it('названия папок', () => {
    expect(getFolderLabel('planned')).toBe('Запланировано');
    expect(getFolderLabel('favorites')).toBe('Любимое');
  });
});
