/**
 * Подписи строк меню быстрых закладок
 */

/**
 * Надпись пустого подменю: закладки, «Запланировано», «Любимое»
 */
export const EMPTY_LIST_TEXT = 'Пока тут пусто';

/**
 * Подпись закладки: с номером эпизода либо без него
 */
export const formatContinueLabel = (episodeNumber: string): string => {
  const number = episodeNumber.trim();

  return number ? `Продолжить · ${number} эпизод` : 'Продолжить просмотр';
};

/**
 * Подпись скачанной серии: с номером эпизода либо без него
 */
export const formatOfflineLabel = (episodeNumber: string): string => {
  const number = episodeNumber.trim();

  return number ? `Скачано · ${number} эпизод` : 'Скачано';
};
