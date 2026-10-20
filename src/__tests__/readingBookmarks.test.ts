import { toReadingBookmarks } from '../renderer/utils/readingBookmarks';

describe('toReadingBookmarks', () => {
  it('с главой ведёт в читалку на неё', () => {
    expect(
      toReadingBookmarks(
        [
          {
            media: {
              slug_url: '1284--relife',
              rus_name: 'ReLIFE',
              cover: { thumbnail: 't.jpg', default: 'd.jpg' },
            },
            item: { volume: '5', number: '222.5' },
          },
        ],
        'manga',
      ),
    ).toEqual([
      {
        slugUrl: '1284--relife',
        title: 'ReLIFE',
        coverUrl: 't.jpg',
        caption: 'Продолжить чтение · гл. 222.5',
        path: '/ru/1284--relife/read/v5/c222.5',
      },
    ]);
  });

  it('без главы ведёт на страницу тайтла своего раздела', () => {
    const [manga] = toReadingBookmarks(
      [{ media: { slug_url: '1--a', name: 'A' }, item: null }],
      'manga',
    );
    const [ranobe] = toReadingBookmarks(
      [{ media: { slug_url: '2--b', name: 'B' }, item: null }],
      'ranobe',
    );

    expect(manga.path).toBe('/ru/manga/1--a');
    expect(manga.caption).toBe('Открыть тайтл');
    expect(ranobe.path).toBe('/ru/book/2--b');
  });

  it('пропускает записи без slug', () => {
    expect(toReadingBookmarks([{ media: null }, {}, null], 'manga')).toEqual(
      [],
    );
  });
});
