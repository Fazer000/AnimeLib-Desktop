/**
 * Константы плеера
 */

/**
 * Радиус скругления плеера в оконном режиме (MUI spacing)
 */
export const PLAYER_BORDER_RADIUS = 2;

/**
 * Горизонтальный отступ плеера от краёв области, px
 */
export const PLAYER_INSET_X = 8;

/**
 * Вертикальный отступ плеера от краёв области, px
 */
export const PLAYER_INSET_Y = 16;

/**
 * Размер значков нижней панели управления плеером, px
 */
export const PLAYER_CONTROL_ICON_SIZE = 24;

/**
 * Длительность перехода в полноэкранный режим и обратно, мс
 */
export const PLAYER_FULLSCREEN_TRANSITION = 320;

/**
 * Кривая плавности перехода в полноэкранный режим
 */
export const PLAYER_FULLSCREEN_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Начальное состояние слайдера эпизодов (виден в полноэкранном режиме)
 */
export const PLAYER_EPISODES_VISIBLE_BY_DEFAULT = true;

/**
 * Соо/**
 * Соотношение сторон видео по умолчанию (до загрузки реального)
 */
export const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9;

/**
 * Размер центральной иконки плей/пауза, px
 */
export const PLAYER_CENTER_ICON_SIZE = 180;

/**
 * Размер глифа центральной иконки плей/пауза, px
 */
export const PLAYER_CENTER_ICON_FONT_SIZE = 124;

/**
 * Доля просмотра, после которой серия отмечается просмотренной
 */
export const WATCH_VIEW_THRESHOLD = 0.6;

/**
 * Идентификаторы плееров в API (регистр важен)
 */
export const PLAYER_TYPE_ANIMELIB = 'Animelib';
export const PLAYER_TYPE_KODIK = 'Kodik';
