/**
 * Константы плеера
 */

/**
 * Радиус скругления кадра. Ноль: кадр вровень с сайдбаром и шапкой
 */
export const PLAYER_BORDER_RADIUS = 0;

/**
 * Радиус скругления кадра в полноэкранном режиме (MUI spacing)
 */
export const PLAYER_FULLSCREEN_RADIUS = 2;

/**
 * Горизонтальный отступ кадра от краёв области, px
 */
export const PLAYER_INSET_X = 0;

/**
 * Вертикальный отступ кадра от краёв области, px
 */
export const PLAYER_INSET_Y = 0;

/**
 * Размер значков нижней панели управления плеером, px
 */
export const PLAYER_CONTROL_ICON_SIZE = 24;

/**
 * Отступ угловых значков от кромки кадра, px
 */
export const PLAYER_CORNER_INSET = 14;

/**
 * Высота затемнения у верхней кромки кадра, px
 */
export const PLAYER_TOP_SCRIM_HEIGHT = 150;

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
 * Размер центральной иконки плей/пауза, считается от высоты кадра
 */
export const PLAYER_CENTER_ICON_SIZE = 'clamp(70px, 20cqh, 180px)';

/**
 * Размер глифа центральной иконки плей/пауза, считается от высоты кадра
 */
export const PLAYER_CENTER_ICON_FONT_SIZE = 'clamp(48px, 14cqh, 124px)';

/**
 * Оптический сдвиг глифа плей вправо, доля его кегля
 */
export const PLAYER_PLAY_GLYPH_OFFSET = '0.065em';

/**
 * Отступ надписи над видео от верхнего края кадра
 */
export const PLAYER_INFO_TOP = 'clamp(6px, 1.8cqh, 16px)';

/**
 * Предельная ширина надписи над видео
 */
export const PLAYER_INFO_MAX_WIDTH = '70cqw';

/**
 * Кегль названия аниме над видео
 */
export const PLAYER_TITLE_FONT = 'clamp(0.95rem, 2.7cqh, 1.5rem)';

/**
 * Кегль строки эпизода и озвучки над видео
 */
export const PLAYER_SUBTITLE_FONT = 'clamp(0.7rem, 1.7cqh, 0.9rem)';

/**
 * Кегль строки рейтинга и года над видео
 */
export const PLAYER_META_FONT = 'clamp(0.68rem, 1.6cqh, 0.85rem)';

/**
 * Отступ меню настроек от краёв кадра, px
 */
export const SETTINGS_MENU_MARGIN = 16;

/**
 * Ширина зоны наведения для переключения эпизода
 */
export const EPISODE_HINT_AREA_WIDTH = 'max(10%, 132px)';

/**
 * Размер кнопки переключения эпизода, считается от высоты кадра
 */
export const EPISODE_HINT_BUTTON_SIZE = 'clamp(40px, 6.7cqh, 60px)';

/**
 * Размер стрелки переключения эпизода, считается от высоты кадра
 */
export const EPISODE_HINT_ICON_SIZE = 'clamp(24px, 4cqh, 36px)';

/**
 * Кегль подписи под кнопкой переключения эпизода
 */
export const EPISODE_HINT_FONT = 'clamp(11px, 1.6cqh, 14px)';

/**
 * Доля просмотра, после которой серия отмечается просмотренной
 */
export const WATCH_VIEW_THRESHOLD = 0.6;

/**
 * Идентификаторы плееров в API (регистр важен)
 */
export const PLAYER_TYPE_ANIMELIB = 'Animelib';
export const PLAYER_TYPE_KODIK = 'Kodik';

/**
 * Ключ localStorage для настроек субтитров
 */
export const SUBTITLES_STORAGE_KEY = 'animeLibSubtitlesSettings';

/**
 * Доступные масштабы шрифта субтитров
 */
/**
 * Шкала времени перемотки: шаг, потолок и цена деления, сек
 */
/**
 * Ширина меню настроек, px
 */
export const SETTINGS_MENU_WIDTH = 300;

/**
 * Боковой отступ содержимого меню настроек (MUI spacing)
 */
export const SETTINGS_MENU_PADDING_X = 2.5;

export const SKIP_TIME_STEP = 5;
export const SKIP_TIME_MAX = 300;
export const SKIP_TIME_MARK_STEP = 60;

export const SUBTITLES_FONT_SCALES = [0.75, 1, 1.25, 1.5, 2];

/**
 * Доступные вертикальные смещения субтитров
 */
export const SUBTITLES_OFFSETS = [0, 20, 40, 60];

/**
 * Режимы окантовки субтитров
 */
export const SUBTITLES_OUTLINE_MODES: Array<{
  value: 'outline' | 'box' | 'none';
  label: string;
}> = [
  { value: 'outline', label: 'Обводка' },
  { value: 'box', label: 'Подложка' },
  { value: 'none', label: 'Без' },
];

/**
 * Настройки субтитров по умолчанию
 */
export const SUBTITLES_DEFAULT_SETTINGS = {
  trackName: null as string | null,
  fontScale: 1,
  outline: 'outline' as 'none' | 'outline' | 'box',
  offsetY: 0,
};

/**
 * Базовый размер шрифта srt/vtt-субтитров, % высоты плеера
 */
export const SUBTITLES_BASE_FONT_CQH = 4.4;

/**
 * Ключ localStorage для настроек комментариев
 */
export const COMMENTS_SETTINGS_STORAGE_KEY = 'animeLibCommentsSettings';

/**
 * Префикс ключа последнего просмотра комментариев эпизода
 */
export const COMMENTS_LAST_SEEN_PREFIX = 'animeLibCommentsSeen:';

/**
 * Границы уровня автосворачивания веток
 */
export const COMMENTS_COLLAPSE_MIN_LEVEL = 1;
export const COMMENTS_COLLAPSE_MAX_LEVEL = 10;

/**
 * Настройки комментариев по умолчанию
 */
export const COMMENTS_SETTINGS_DEFAULTS = {
  disabled: false,
  highlightNew: false,
  collapseFromLevel: COMMENTS_COLLAPSE_MAX_LEVEL,
};

/**
 * Размеры кнопок, примыкающих к кромке кадра
 */
export const PLAYER_EDGE_BUTTON_SIZE = 42;
export const PLAYER_EDGE_BUTTON_RADIUS = 14;
