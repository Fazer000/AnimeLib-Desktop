/**
 * Константы папок закладок, подписок на выход серий и оценок тайтла
 */

/**
 * Идентификатор сайта аниме в поле site_ids папок
 */
export const ANIME_SITE_ID = 5;

/**
 * Папка «Смотрю»: в неё попадает тайтл при первом сохранении прогресса
 */
export const BOOKMARK_STATUS_WATCHING = 21;

/**
 * Папка «Запланировано»: в неё кнопка добавляет тайтл без закладки
 */
export const BOOKMARK_STATUS_PLANNED = 22;

/** Задержка перезагрузки списков после изменения закладок, мс */
export const BOOKMARKS_REFRESH_DELAY_MS = 400;

/**
 * Папка «Любимые»
 */
export const BOOKMARK_STATUS_FAVORITE = 25;

/**
 * Папка «Пересматриваю»
 */
export const BOOKMARK_STATUS_REWATCHING = 26;

/**
 * Папки, из которых собираются быстрые закладки «продолжить просмотр»
 */
export const QUICK_BOOKMARK_STATUSES = [
  BOOKMARK_STATUS_WATCHING,
  BOOKMARK_STATUS_REWATCHING,
];

/** Папка «Читаю» на сайтах манги и ранобэ: из неё собираются закладки подменю на этих сайтах */
export const BOOKMARK_STATUS_READING = 1;

/**
 * Папки «В планах» и «Любимые» на сайтах манги и ранобэ
 */
export const BOOKMARK_STATUS_READING_PLANNED = 2;
export const BOOKMARK_STATUS_READING_FAVORITE = 5;

/**
 * Типы перевода в подписках на выход серий
 */
export const TRANSLATION_TYPE_SUBTITLES = 1;
export const TRANSLATION_TYPE_VOICE = 2;

/**
 * team_id «Любая команда» в подписке
 */
export const SUBSCRIPTION_ANY_TEAM = 0;

/**
 * branch_id команды: оба типа перевода, только субтитры, только озвучка
 */
export const TEAM_BRANCH_BOTH = 0;
export const TEAM_BRANCH_SUBTITLES = 1;
export const TEAM_BRANCH_VOICE = 2;

/**
 * Число звёзд в оценке тайтла
 */
export const RATING_MAX_SCORE = 10;
