/**
 * Сортировка библиотеки скачанного по дате загрузки или названию
 */
import {
  OfflineAnime,
  OfflineLibrarySort,
  OfflineLibrarySortDirection,
  OfflineLibrarySortField,
} from '../../constants';

const FIELD_LABELS: Record<OfflineLibrarySortField, string> = {
  downloaded: 'По дате загрузки',
  title: 'По названию',
};

const DIRECTION_LABELS: Record<OfflineLibrarySort, string> = {
  'downloaded-desc': 'Сначала новые',
  'downloaded-asc': 'Сначала старые',
  'title-asc': 'А–Я',
  'title-desc': 'Я–А',
};

/**
 * Проверяет, что значение — известный ключ сортировки
 */
export function isLibrarySort(value: unknown): value is OfflineLibrarySort {
  return typeof value === 'string' && value in DIRECTION_LABELS;
}

/**
 * Разбирает ключ на поле и направление
 */
export function splitLibrarySort(sort: OfflineLibrarySort): {
  field: OfflineLibrarySortField;
  direction: OfflineLibrarySortDirection;
} {
  const [field, direction] = sort.split('-') as [
    OfflineLibrarySortField,
    OfflineLibrarySortDirection,
  ];

  return { field, direction };
}

/**
 * Новое поле сортировки с естественным для него направлением:
 * дата — сначала новые, название — от А до Я
 */
export function withSortField(
  field: OfflineLibrarySortField,
): OfflineLibrarySort {
  return field === 'downloaded' ? 'downloaded-desc' : 'title-asc';
}

/**
 * То же поле с обратным направлением
 */
export function toggleSortDirection(
  sort: OfflineLibrarySort,
): OfflineLibrarySort {
  const { field, direction } = splitLibrarySort(sort);

  return `${field}-${direction === 'asc' ? 'desc' : 'asc'}`;
}

/**
 * Подпись поля сортировки в списке
 */
export const getSortFieldLabel = (field: OfflineLibrarySortField): string =>
  FIELD_LABELS[field];

/**
 * Подпись направления для подсказки кнопки
 */
export const getSortDirectionLabel = (sort: OfflineLibrarySort): string =>
  DIRECTION_LABELS[sort];

/**
 * Время загрузки тайтла: когда скачана его последняя серия, мс
 */
export function getDownloadedAt(anime: OfflineAnime): number {
  const times = anime.episodes
    .map((episode) => Date.parse(episode.createdAt))
    .filter((time) => !Number.isNaN(time));

  if (times.length > 0) {
    return Math.max(...times);
  }

  const updated = Date.parse(anime.updatedAt);

  return Number.isNaN(updated) ? 0 : updated;
}

/**
 * Сравнивает названия по-русски, числа внутри — по значению
 */
const compareTitles = (a: OfflineAnime, b: OfflineAnime): number =>
  a.title.localeCompare(b.title, 'ru', { numeric: true, sensitivity: 'base' });

/**
 * Возвращает новый список тайтлов в заданном порядке
 */
export function sortLibrary(
  anime: OfflineAnime[],
  sort: OfflineLibrarySort,
): OfflineAnime[] {
  const { field, direction } = splitLibrarySort(sort);
  const sign = direction === 'asc' ? 1 : -1;

  return [...anime].sort((a, b) => {
    const byField =
      field === 'downloaded'
        ? getDownloadedAt(a) - getDownloadedAt(b)
        : compareTitles(a, b);

    return byField * sign || compareTitles(a, b);
  });
}
