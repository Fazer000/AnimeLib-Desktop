/** Кнопка «Начать / Продолжить» вместо «Лицензирован» на странице тайтла */

export interface TitleActionItem {
  id: number;
  volume?: string | number | null;
  number?: string | number | null;
}

export interface TitleActionInput {
  watch: boolean;
  slug: string;
  items: TitleActionItem[];
  bookmarkItemId: number | null;
  userId?: string | null;
}

export interface TitleActionModel {
  available: boolean;
  label: string;
  counter: string;
  href: string | null;
}

/** Что показать на кнопке: подпись, счётчик «позиция / всего» и куда вести */
export function buildTitleAction(input: TitleActionInput): TitleActionModel {
  const { watch, slug, items, bookmarkItemId, userId } = input;

  if (items.length === 0) {
    return {
      available: false,
      label: watch ? 'Серии недоступны' : 'Главы недоступны',
      counter: '',
      href: null,
    };
  }

  const index =
    bookmarkItemId === null
      ? -1
      : items.findIndex((item) => item.id === bookmarkItemId);
  const started = index >= 0;
  const target = items[started ? index : 0];
  const verb = watch ? 'смотреть' : 'читать';

  return {
    available: true,
    label: `${started ? 'Продолжить' : 'Начать'} ${verb}`,
    counter: `${started ? index + 1 : 0} / ${items.length}`,
    href: watch
      ? `/ru/anime/${slug}/watch`
      : `/ru/${slug}/read/v${target.volume ?? 1}/c${target.number ?? 1}${
          userId ? `?ui=${userId}` : ''
        }`,
  };
}
