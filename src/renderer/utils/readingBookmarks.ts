import type { LibSiteKind } from '../../constants';

/**
 * Закладка «Читаю» для подменю: куда вести и что подписать
 */
export interface ReadingBookmark {
  slugUrl: string;
  title: string;
  coverUrl: string | null;
  caption: string;
  path: string;
}

interface RawReadingBookmark {
  media?: {
    slug_url?: string;
    name?: string;
    rus_name?: string;
    cover?: { thumbnail?: string; default?: string } | null;
  } | null;
  item?: { volume?: string | number; number?: string | number } | null;
}

/**
 * Закладки сайта манги или ранобэ в строки подменю. С главой — ссылка
 * на неё в читалке, без главы — на страницу тайтла
 */
export function toReadingBookmarks(
  items: unknown[],
  kind: LibSiteKind,
): ReadingBookmark[] {
  const section = kind === 'ranobe' ? 'book' : 'manga';

  return (items as RawReadingBookmark[]).flatMap((raw) => {
    const slug = raw?.media?.slug_url;
    if (!slug) return [];

    const chapter = raw.item;
    const hasChapter =
      chapter?.volume !== undefined &&
      chapter?.volume !== null &&
      chapter?.number !== undefined &&
      chapter?.number !== null;

    return [
      {
        slugUrl: slug,
        title: raw.media?.rus_name || raw.media?.name || slug,
        coverUrl:
          raw.media?.cover?.thumbnail || raw.media?.cover?.default || null,
        caption: hasChapter
          ? `Продолжить чтение · гл. ${chapter.number}`
          : 'Открыть тайтл',
        path: hasChapter
          ? `/ru/${slug}/read/v${chapter.volume}/c${chapter.number}`
          : `/ru/${section}/${slug}`,
      },
    ];
  });
}
