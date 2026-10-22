/**
 * Метрики раскладки страницы плеера и минимальный размер окна
 */

import { PLAYER_INSET_X, PLAYER_INSET_Y } from './player';

/**
 * Высота тулбара, px
 */
export const TOOLBAR_HEIGHT = 38;

/**
 * Кнопка прокрутки вверх: размер, отступ от угла и зазор до чужих
 * плавающих элементов, px
 */
export const SCROLL_TOP_BUTTON_SIZE = 48;
export const SCROLL_TOP_BUTTON_MARGIN = 24;
export const SCROLL_TOP_BUTTON_GAP = 12;

/**
 * Прокрутка страницы сайта, после которой появляется кнопка вверх, px
 */
export const SITE_SCROLL_TOP_THRESHOLD = 300;

/**
 * Обложка в строке закладки, px
 */
export const BOOKMARKS_COVER = { width: 44, height: 62 } as const;

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
export const ANIME_CARD_COVER_WIDTH = 'clamp(100px, 7.4vw, 127px)';

/**
 * Высота обложки в карточке аниме
 */
export const ANIME_CARD_COVER_HEIGHT = 'clamp(150px, 11.1vw, 190px)';

/**
 * Кегль названия аниме в карточке
 */
export const ANIME_CARD_TITLE_FONT = 'clamp(1rem, 1.5vw, 1.5rem)';

/**
 * Обрамление обложки в карточке аниме: внешний и внутренний отступы и рамка, px
 */
export const ANIME_CARD_FRAME_HEIGHT = 42;

/**
 * Высота шторки карточки. Одна для загрузки и для готовых данных,
 * иначе шторка подпрыгивает, когда данные приходят
 */
export const ANIME_CARD_PANEL_HEIGHT = `calc(${ANIME_CARD_COVER_HEIGHT} + ${ANIME_CARD_FRAME_HEIGHT}px)`;

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
 * Запас под слайдером эпизодов, когда высоту ряда плеера ограничивает окно, px
 */
export const PLAYER_SLIDER_BOTTOM_GAP = 24;

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
  MIN_VIDEO_AREA_HEIGHT +
  TOOLBAR_HEIGHT +
  EPISODE_SLIDER_HEIGHT +
  PLAYER_SLIDER_BOTTOM_GAP;

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
export const OFFLINE_COVER = { width: 90, height: 125 } as const;

/**
 * Ширина кнопки действия в библиотеке. Задана явно, чтобы «Смотреть»
 * и «Продолжить» занимали одинаковое место и не сдвигали шеврон
 */
export const OFFLINE_LIBRARY_ACTION_WIDTH = 160;

/**
 * Ширина поля сортировки библиотеки вместе с кнопкой направления, px
 */
export const OFFLINE_LIBRARY_SORT_WIDTH = 250;

/**
 * Ширина затухания карусели связанного у края со скрытыми карточками, px
 */
export const RELATED_EDGE_FADE = 56;

/**
 * Размеры карточки связанного, px
 */
export const RELATED_CARD_WIDTH = 440;
export const RELATED_CARD_HEIGHT = 180;

/**
 * Зазор между карточками связанного, px. Вместе с шириной задаёт шаг прокрутки
 */
export const RELATED_CARD_GAP = 20;

/**
 * Ширина обложки связанного: во всю высоту карточки в пропорции постера 2:3, px
 */
export const RELATED_COVER_WIDTH = Math.round((RELATED_CARD_HEIGHT * 2) / 3);

/**
 * Сколько строк названия помещается в карточке связанного
 */
export const RELATED_TITLE_LINES = 4;

/**
 * Ширина раскрытого поля перехода к серии, px
 */
export const EPISODE_JUMP_INPUT_WIDTH = 80;

/**
 * Сторона кнопки поиска и высота поля перехода к серии: по высоте чипа эпизода, px
 */
export const EPISODE_SEARCH_SIZE = 44;

/**
 * Отступ разделителя от блока поиска и высота разделителя, px
 */
export const EPISODE_SEARCH_DIVIDER_GAP = 8;
export const EPISODE_SEARCH_DIVIDER_HEIGHT = 28;

/**
 * Ширина закрытого блока поиска с разделителем: распорка справа повторяет её
 */
export const EPISODE_SEARCH_BLOCK_WIDTH =
  EPISODE_SEARCH_SIZE + EPISODE_SEARCH_DIVIDER_GAP + 1;

/**
 * Размер круглых кнопок слайдера эпизодов, px
 */
export const EPISODE_SLIDER_BUTTON_SIZE = 32;

/**
 * Ширина затухания слайдера эпизодов у края со скрытыми сериями, px
 */
export const EPISODE_SLIDER_EDGE_FADE = 56;

/**
 * Прокрутка лент серий колесом: множитель сдвига колеса и пауза, после которой
 * цель прокрутки снова берётся из текущего положения ленты, мс
 */
export const SLIDER_WHEEL_SCROLL_MULTIPLIER = 3;
export const SLIDER_WHEEL_IDLE_MS = 200;

/**
 * Граф хронологии: размеры узла, высота ряда и зазор между узлами ряда, px
 */
export const FRANCHISE_NODE_WIDTH = 190;
export const FRANCHISE_NODE_HEIGHT = 64;
export const FRANCHISE_ROW_HEIGHT = 84;
export const FRANCHISE_NODE_GAP = 16;

/**
 * Сколько рядов ответвлений помещается над и под основной линией
 */
export const FRANCHISE_ROWS_ABOVE = 2;
export const FRANCHISE_ROWS_BELOW = 3;

/**
 * Шкала хронологии: наименьшая ширина года с тайтлами и ширина разрыва
 * на месте подряд идущих пустых лет, px
 */
export const FRANCHISE_MIN_YEAR_WIDTH = 160;
export const FRANCHISE_EMPTY_GAP_WIDTH = 64;

/**
 * Хронология: ширина закреплённой легенды слева и высота оси годов сверху, px
 */
export const FRANCHISE_LEGEND_WIDTH = 190;
export const FRANCHISE_AXIS_HEIGHT = 30;

/**
 * Наименьшая высота области хронологии: как у ленты связанного, чтобы
 * комментарии не сдвигались при смене вкладки. Сверху высоту ограничивает
 * число рядов, поэтому по вертикали граф не прокручивается и колесо
 * листает страницу, px
 */
export const FRANCHISE_MIN_HEIGHT = RELATED_CARD_HEIGHT + 16;

/**
 * Высота полоски с пояснением линий под хронологией, px. Входит в общую
 * наименьшую высоту блока
 */
export const FRANCHISE_LEGEND_BAR_HEIGHT = 28;

/** Отступы раскрытой во всё окно хронологии, px. */
export const FRANCHISE_EXPANDED_PADDING = 24;

/** Насколько раскрытую хронологию можно утащить за края, px. */
export const FRANCHISE_EXPANDED_OVERSCROLL = 160;

/** Высота ряда раскрытой хронологии: шире промежуток между рядами для связей, px. */
export const FRANCHISE_EXPANDED_ROW_HEIGHT = 124;

/** Раскрытая хронология: выше плеера, ниже карточки аниме и шапки. */
export const FRANCHISE_EXPANDED_Z_INDEX = 1250;

/** Выезжающая карточка аниме: поверх раскрытой хронологии. */
export const ANIME_INFO_CARD_Z_INDEX = 1260;

/**
 * Левая панель приложения: ширина, размер кнопок и значков в них, ширина
 * выдвижного подменю и размер язычка, которым панель прячется, px
 */
export const SIDE_RAIL_WIDTH = 52;
export const SIDE_RAIL_BUTTON_SIZE = 42;
export const SIDE_RAIL_ICON_SIZE = 24;
export const SIDE_RAIL_SITE_ICON_SIZE = 28;
export const SIDE_FLYOUT_WIDTH = 300;
export const SIDE_RAIL_TAB = { width: 14, height: 56 };

/**
 * Скрыта ли левая панель — запоминается между запусками
 */
export const SIDE_RAIL_HIDDEN_STORAGE_KEY = 'animeLibSideRailHidden';
