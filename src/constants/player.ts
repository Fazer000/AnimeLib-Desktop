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

/**
 * Ключ localStorage для настроек субтитров
 */
export const SUBTITLES_STORAGE_KEY = 'animeLibSubtitlesSettings';

/**
 * Доступные масштабы шрифта субтитров
 */
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
