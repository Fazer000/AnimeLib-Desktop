/**
 * Метрики раскладки страницы плеера и минимальный размер окна
 */

import { PLAYER_INSET_X, PLAYER_INSET_Y } from './player';

/**
 * Высота тулбара, px
 */
export const TOOLBAR_HEIGHT = 32;

/**
 * Позиция плавающих кнопок вне плеера, px
 */
export const SITE_HEADER_HEIGHT = 63;
export const FLOATING_BUTTONS_LEFT = 24;
export const FLOATING_BUTTONS_TOP =
  TOOLBAR_HEIGHT + SITE_HEADER_HEIGHT + FLOATING_BUTTONS_LEFT;
export const FLOATING_BUTTONS_GAP = 64;
export const FLOATING_BUTTONS_BOTTOM = FLOATING_BUTTONS_LEFT;

/**
 * Границы резиновой ширины сайдбара озвучек, px
 */
export const SIDEBAR_MIN_WIDTH = 300;
export const SIDEBAR_MAX_WIDTH = 360;

/**
 * Предпочтительная ширина сайдбара (доля ширины окна)
 */
export const SIDEBAR_PREFERRED_WIDTH = '24vw';

/**
 * CSS-ширина сайдбара с ограничениями min/max
 */
export const SIDEBAR_WIDTH_CSS = `clamp(${SIDEBAR_MIN_WIDTH}px, ${SIDEBAR_PREFERRED_WIDTH}, ${SIDEBAR_MAX_WIDTH}px)`;

/**
 * Ширина сайдбара для расчёта минимума окна (нижняя граница clamp), px
 */
export const SIDEBAR_WIDTH = SIDEBAR_MIN_WIDTH;

/**
 * Отступ сайдбара с каждой стороны, px
 */
export const SIDEBAR_MARGIN = 8;

/**
 * Высота полосы эпизодов, px
 */
export const EPISODE_SLIDER_HEIGHT = 72;

/**
 * Ширина скроллбара страницы плеера, px
 */
export const SCROLLBAR_WIDTH = 6;

/**
 * Минимальный размер видео, помещающегося целиком (360p), px
 */
export const MIN_VIDEO_WIDTH = 640;
export const MIN_VIDEO_HEIGHT = 360;

/**
 * Минимальная высота области видео, px
 */
export const MIN_VIDEO_AREA_HEIGHT = MIN_VIDEO_HEIGHT + PLAYER_INSET_Y;

/**
 * Минимальная ширина окна, при которой видео 360p помещается целиком, px
 */
export const MIN_WINDOW_WIDTH =
  MIN_VIDEO_WIDTH +
  PLAYER_INSET_X +
  SIDEBAR_WIDTH +
  SIDEBAR_MARGIN * 2 +
  SCROLLBAR_WIDTH;

/**
 * Минимальная высота окна, при которой видео 360p помещается целиком, px
 */
export const MIN_WINDOW_HEIGHT =
  MIN_VIDEO_AREA_HEIGHT + TOOLBAR_HEIGHT + EPISODE_SLIDER_HEIGHT;

/**
 * Размеры диалога менеджера загрузок
 */
export const OFFLINE_DIALOG_MAX_WIDTH = 'lg';
export const OFFLINE_DIALOG_HEIGHT = 'min(820px, 92vh)';
export const OFFLINE_FOOTER_HEIGHT = 66;
export const OFFLINE_ACTIONS_HEIGHT = 70;
export const OFFLINE_TAB_HEIGHT = 44;

/**
 * Шрифтовая шкала менеджера загрузок
 */
export const OFFLINE_FONT = {
  dialogTitle: '1.26rem',
  tab: '0.98rem',
  section: '1.08rem',
  title: '1.02rem',
  body: '0.96rem',
  episode: '0.94rem',
  caption: '0.9rem',
  hint: '0.84rem',
  button: '0.9rem',
} as const;

/**
 * Размеры иконок менеджера загрузок, px
 */
export const OFFLINE_ICON = {
  sm: 17,
  md: 20,
  lg: 22,
  xl: 24,
} as const;

/**
 * Размер обложки в библиотеке, px
 */
export const OFFLINE_COVER = { width: 72, height: 100 } as const;

/**
 * Ширина кнопки действия в библиотеке. Задана явно, чтобы «Смотреть»
 * и «Продолжить» занимали одинаковое место и не сдвигали шеврон
 */
export const OFFLINE_LIBRARY_ACTION_WIDTH = 160;
