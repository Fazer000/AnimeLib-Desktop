/**
 * Метрики раскладки страницы плеера и минимальный размер окна
 */

import { PLAYER_INSET_X, PLAYER_INSET_Y } from './player';

/**
 * Высота тулбара, px
 */
export const TOOLBAR_HEIGHT = 32;

/**
 * Ширина сайдбара озвучек, px
 */
export const SIDEBAR_WIDTH = 260;

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
