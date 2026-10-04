/**
 * Константы приложения
 * Единая точка для всех метаданных приложения
 */

import packageJson from '../../package.json';

/**
 * Название приложения
 */
export const APP_NAME = 'AnimeLib Desktop';

/**
 * Короткое название (для internal использования)
 */
export const APP_NAME_SHORT = 'AnimeLib';

/**
 * Версия приложения (берется из package.json)
 */
export const APP_VERSION = packageJson.version;

/**
 * Описание приложения
 */
export const APP_DESCRIPTION = packageJson.description;

/**
 * URL домашней страницы
 */
export const APP_HOMEPAGE = packageJson.homepage;

/**
 * URL репозитория
 */
export const APP_REPOSITORY = 'https://github.com/Fazer000/AnimeLib-Desktop';

/**
 * Служебная схема сигнала об открытии плеера
 */
export const PLAYER_PROTOCOL_PREFIX = 'anime-lib-player://';

/**
 * Автор приложения
 */
export const APP_AUTHOR = 'Fazer';

/**
 * Идентификатор приложения в Windows. Берётся из appId сборки: по нему система
 * находит ярлык установщика и показывает имя и значок в медиакарточке и уведомлениях
 */
export const APP_USER_MODEL_ID = packageJson.build.appId;

/**
 * Полная информация о приложении
 */
export const APP_INFO = {
  name: APP_NAME,
  nameShort: APP_NAME_SHORT,
  version: APP_VERSION,
  description: APP_DESCRIPTION,
  homepage: APP_HOMEPAGE,
  repository: APP_REPOSITORY,
  author: APP_AUTHOR,
} as const;

/**
 * Повторы запроса к API при ответе 429: число попыток и границы паузы, мс.
 * Сайт блокирует примерно на 30 с, попыток хватает пережить блокировку дважды
 */
export const API_RATE_LIMIT_RETRIES = 6;
export const API_RATE_LIMIT_BASE_DELAY_MS = 2000;
export const API_RATE_LIMIT_MAX_DELAY_MS = 30000;

/**
 * Как часто главный процесс проверяет курсор над зоной наведения
 * в области перетаскивания окна, мс
 */
export const HOVER_ZONE_POLL_MS = 50;
