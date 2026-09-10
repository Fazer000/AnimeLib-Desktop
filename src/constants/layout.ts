/**
 * Метрики раскладки страницы плеера и минимальный размер окна
 */

import { PLAYER_INSET_X, PLAYER_INSET_Y } from './player';

/**
 * Высота тулбара, px
 */
export const TOOLBAR_HEIGHT = 38;

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
 * Панель быстрых закладок, примыкающая к кнопке
 */
export const BOOKMARKS_PANEL_WIDTH = 320;
export const BOOKMARKS_PANEL_MAX_HEIGHT = 420;
export const BOOKMARKS_PANEL_RADIUS = 10;
export const BOOKMARKS_PANEL_DURATION_MS = 300;
export const BOOKMARKS_PANEL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const BOOKMARKS_COVER = { width: 44, height: 62 } as const;

/**
 * Матовая поверхность краевых кнопок и панели закладок
 */
export const EDGE_SURFACE_ALPHA = 0.72;
export const EDGE_SURFACE_BLUR = 'blur(14px)';
export const EDGE_ACCENT_BORDER_ALPHA = 0.45;

/**
 * Границы резиновой ширины сайдбара озвучек, px
 */
export const SIDEBAR_MIN_WIDTH = 280;
export const SIDEBAR_MAX_WIDTH = 320;

/**
 * Предпочтительная ширина сайдбара (доля ширины окна)
 */
export const SIDEBAR_PREFERRED_WIDTH = '17vw';

/**
 * CSS-ширина сайдбара с ограничениями min/max
 */
export const SIDEBAR_WIDTH_CSS = `clamp(${SIDEBAR_MIN_WIDTH}px, ${SIDEBAR_PREFERRED_WIDTH}, ${SIDEBAR_MAX_WIDTH}px)`;

/**
 * Свойство, хранящее текущую ширину сайдбара. Зарегистрировано в App.css
 * как <length>, поэтому анимируется, а вместе с ним и всё, что от него считается
 */
export const SIDEBAR_WIDTH_PROPERTY = '--player-sidebar-width';

/**
 * Ссылка на текущую ширину сайдбара для расчётов вёрстки
 */
export const SIDEBAR_WIDTH_VAR = `var(${SIDEBAR_WIDTH_PROPERTY})`;

/**
 * Длительность и кривая сворачивания сайдбара
 */
export const SIDEBAR_TRANSITION = 300;
export const SIDEBAR_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * Ширина полоски-язычка карточки аниме в шапке, px
 */
export const ANIME_HANDLE_WIDTH = 54;

/**
 * Толщина полоски-язычка карточки аниме, px
 */
export const ANIME_HANDLE_HEIGHT = 5;

/**
 * Ширина зоны наведения, вызывающей карточку аниме, px
 */
export const ANIME_HANDLE_HOVER_WIDTH = 180;

/**
 * Насколько зона наведения выступает ниже шапки, px
 */
export const ANIME_HANDLE_HOVER_OVERHANG = 40;

/**
 * Нижняя граница ширины карточки аниме
 */
export const ANIME_CARD_MIN_WIDTH = '25vw';

/**
 * Верхняя граница ширины карточки аниме
 */
export const ANIME_CARD_MAX_WIDTH = '50vw';

/**
 * Ширина обложки в карточке аниме
 */
export const ANIME_CARD_COVER_WIDTH = 'clamp(64px, 6vw, 100px)';

/**
 * Высота обложки в карточке аниме
 */
export const ANIME_CARD_COVER_HEIGHT = 'clamp(96px, 9vw, 150px)';

/**
 * Кегль названия аниме в карточке
 */
export const ANIME_CARD_TITLE_FONT = 'clamp(1rem, 1.5vw, 1.5rem)';

/**
 * Высота поля поиска озвучек в сайдбаре, px
 */
export const SIDEBAR_SEARCH_HEIGHT = 32;

/**
 * Кегль иконок в поле поиска озвучек, px
 */
export const SIDEBAR_SEARCH_ICON_SIZE = 16;

/**
 * Ширина сайдбара для расчёта минимума окна (нижняя граница clamp), px
 */
export const SIDEBAR_WIDTH = SIDEBAR_MIN_WIDTH;

/**
 * Резиновая ширина блока связанного: тянется за окном, но не разъезжается на сверхшироких
 */
export const RELATED_WIDTH_CSS = 'clamp(1200px, 96vw, 2000px)';

/**
 * Стрелка прокрутки связанного: размер и зазор до ленты, px
 */
export const RELATED_ARROW_SIZE = 40;
export const RELATED_ROW_PADDING = 16;
export const RELATED_ROW_GAP = 8;

/**
 * Резиновая ширина комментариев: нижняя граница держит читаемую строку,
 * верхняя не даёт строке уйти за сотню знаков
 */
export const COMMENTS_WIDTH_CSS = 'clamp(860px, 66vw, 1400px)';

/**
 * Высота полосы эпизодов, px
 */
export const EPISODE_SLIDER_HEIGHT = 74;

/**
 * Отступы чипа эпизода сверху и снизу (MUI spacing)
 */
export const EPISODE_CHIP_MARGIN_TOP = 3;
export const EPISODE_CHIP_MARGIN_BOTTOM = 2;

/**
 * Минимальная ширина чипа эпизода, px
 */
export const EPISODE_CHIP_MIN_WIDTH = 'clamp(52px, 5.5vw, 84px)';

/**
 * Кегль номера эпизода в ленте
 */
export const EPISODE_CHIP_FONT = '0.95rem';

/**
 * Увеличение карточки связанного при наведении
 */
export const RELATED_CARD_HOVER_SCALE = 1.03;

/**
 * Кегль значка закладки в ленте эпизодов
 */
export const EPISODE_CHIP_ICON_FONT = '1rem';

/**
 * Размер логотипа команды озвучки в сайдбаре, px
 */
export const PLAYER_TEAM_AVATAR_SIZE = 32;

/**
 * Толщина штриха контурных значков
 */
export const ICON_STROKE_WIDTH = 1.75;

/**
 * Отступ между конструкцией плеера и содержимым под ней, px
 */
export const PLAYER_CONTENT_GAP = 64;

/**
 * Ширина скроллбара страницы плеера, px
 */
export const SCROLLBAR_WIDTH = 6;

/**
 * Минимальный размер видео, помещающегося целиком (480p), px
 */
export const MIN_VIDEO_WIDTH = 854;
export const MIN_VIDEO_HEIGHT = 480;

/**
 * Минимальная высота области видео, px
 */
export const MIN_VIDEO_AREA_HEIGHT = MIN_VIDEO_HEIGHT + PLAYER_INSET_Y;

/**
 * Минимальная ширина окна, при которой видео 360p помещается целиком, px
 */
export const MIN_WINDOW_WIDTH =
  MIN_VIDEO_WIDTH + PLAYER_INSET_X + SIDEBAR_WIDTH + SCROLLBAR_WIDTH;

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

/**
 * Отступ крестика закрытия от верхнего и правого края окна, px
 */
export const DIALOG_CLOSE_INSET = 12;

/**
 * Место, которое заголовок окна оставляет крестику справа, px
 */
export const DIALOG_TITLE_RIGHT_INSET = 48;
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
 * Пустое состояние: размер иконки, px, и кегль подписи
 */
export const EMPTY_STATE_ICON_SIZE = 44;
export const EMPTY_STATE_FONT_SIZE = '0.9rem';

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

/**
 * Ширина затухания карусели связанного у края со скрытыми карточками, px
 */
export const RELATED_EDGE_FADE = 56;
