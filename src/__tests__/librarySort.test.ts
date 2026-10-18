import type { OfflineAnime } from '../constants';
import {
  getDownloadedAt,
  getSortDirectionLabel,
  isLibrarySort,
  sortLibrary,
  toggleSortDirection,
  withSortField,
} from '../renderer/utils/librarySort';

const anime = (
  title: string,
  createdAt: string[],
  updatedAt = '',
): OfflineAnime =>
  ({
    animeId: title,
    title,
    updatedAt,
    episodes: createdAt.map((date) => ({ createdAt: date })),
  }) as OfflineAnime;

const titles = (list: OfflineAnime[]) => list.map((item) => item.title);

const library = [
  anime('Виви', ['2026-10-16T10:00:00Z']),
  anime('Атака титанов', ['2026-08-01T10:00:00Z', '2026-10-01T10:00:00Z']),
  anime('Ёлки', ['2026-09-07T10:00:00Z']),
];

describe('getDownloadedAt', () => {
  it('берёт дату последней скачанной серии', () => {
    expect(getDownloadedAt(library[1])).toBe(
      Date.parse('2026-10-01T10:00:00Z'),
    );
  });

  it('без дат серий берёт дату обновления тайтла, без неё — ноль', () => {
    expect(getDownloadedAt(anime('a', [], '2026-01-02T00:00:00Z'))).toBe(
      Date.parse('2026-01-02T00:00:00Z'),
    );
    expect(getDownloadedAt(anime('a', ['мусор']))).toBe(0);
  });
});

describe('sortLibrary', () => {
  it('по дате загрузки — сначала новые', () => {
    expect(titles(sortLibrary(library, 'downloaded-desc'))).toEqual([
      'Виви',
      'Атака титанов',
      'Ёлки',
    ]);
  });

  it('по дате загрузки — сначала старые', () => {
    expect(titles(sortLibrary(library, 'downloaded-asc'))).toEqual([
      'Ёлки',
      'Атака титанов',
      'Виви',
    ]);
  });

  it('по названию учитывает русский алфавит и числа', () => {
    const list = [...library, anime('Сезон 10', []), anime('Сезон 2', [])];

    expect(titles(sortLibrary(list, 'title-asc'))).toEqual([
      'Атака титанов',
      'Виви',
      'Ёлки',
      'Сезон 2',
      'Сезон 10',
    ]);
    expect(titles(sortLibrary(library, 'title-desc'))).toEqual([
      'Ёлки',
      'Виви',
      'Атака титанов',
    ]);
  });

  it('равные даты упорядочивает по названию', () => {
    const same = [anime('Б', ['2026-01-01']), anime('А', ['2026-01-01'])];

    expect(titles(sortLibrary(same, 'downloaded-desc'))).toEqual(['А', 'Б']);
  });

  it('не меняет исходный список', () => {
    const copy = [...library];
    sortLibrary(library, 'title-asc');

    expect(library).toEqual(copy);
  });
});

describe('ключ сортировки', () => {
  it('смена поля ставит естественное направление', () => {
    expect(withSortField('downloaded')).toBe('downloaded-desc');
    expect(withSortField('title')).toBe('title-asc');
  });

  it('кнопка направления разворачивает порядок того же поля', () => {
    expect(toggleSortDirection('downloaded-desc')).toBe('downloaded-asc');
    expect(toggleSortDirection('title-asc')).toBe('title-desc');
  });

  it('подписи направления зависят от поля', () => {
    expect(getSortDirectionLabel('downloaded-desc')).toBe('Сначала новые');
    expect(getSortDirectionLabel('title-desc')).toBe('Я–А');
  });

  it('узнаёт только известные ключи', () => {
    expect(isLibrarySort('title-asc')).toBe(true);
    expect(isLibrarySort('title')).toBe(false);
    expect(isLibrarySort(null)).toBe(false);
  });
});
