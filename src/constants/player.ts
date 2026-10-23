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

/** Шаг округления ширины кадра */
export const PLAYER_WIDTH_SNAP_PX = 2;

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
 * Настройки комментариев по умолчанию
 */
export const COMMENTS_SETTINGS_DEFAULTS = {
  disabled: false,
  highlightNew: false,
  showLoginStreaks: true,
};

/**
 * Размер буфера, в который отражается кадр для подсветки, px
 */
export const AMBIENT_SOURCE_WIDTH = 64;
export const AMBIENT_SOURCE_HEIGHT = 36;

/**
 * Размытие и насыщенность считаются по буферу, а не по растянутому слою
 */
export const AMBIENT_SOURCE_BLUR = 3;
export const AMBIENT_SOURCE_SATURATION = 1.6;

/**
 * Минимальный промежуток между отражениями кадра, мс
 */
export const AMBIENT_FRAME_INTERVAL_MS = 50;

/**
 * Сколько стандартных отклонений нужно гауссиану, чтобы погаснуть
 */
export const AMBIENT_FADE_SIGMA = 3;

/** Поле буфера вокруг кадра, px */
export const AMBIENT_SOURCE_MARGIN = AMBIENT_SOURCE_BLUR * AMBIENT_FADE_SIGMA;

/** Запас на отрисовку свечения за пределами слоя, px */
export const AMBIENT_CLIP_MARGIN = 512;

/**
 * Непрозрачность свечения при воспроизведении и на паузе
 */
export const AMBIENT_OPACITY = 0.85;
export const AMBIENT_IDLE_OPACITY = 0.35;

/**
 * Длительность угасания свечения на паузе, мс
 */
export const AMBIENT_FADE_MS = 800;

/**
 * Поля тоньше этого не подсвечиваются, px
 */
export const LETTERBOX_MIN_PX = 2;

/** На сколько подсветка полей заходит под край кадра */
export const LETTERBOX_SEAM_OVERLAP_PX = 1;

/**
 * Окно усреднения времени кадра апскейла, кадров
 */
export const UPSCALE_FRAME_WINDOW = 60;

/** Наименьший бюджет кадра апскейла (60 Гц), мс */
export const UPSCALE_FRAME_BUDGET_MS = 1000 / 60;

/** Интервал между кадрами длиннее этого — пауза или перемотка, мс */
export const UPSCALE_FRAME_INTERVAL_MAX_MS = 250;

/**
 * Как часто апскейл сообщает статистику, кадров
 */
export const UPSCALE_STATS_INTERVAL = 30;

/** Наибольшая длительность окна статистики апскейла, мс */
export const UPSCALE_STATS_MAX_MS = 2000;

/**
 * Отступ плашки замера от низа кадра: над панелью управления, px
 */
export const UPSCALE_HUD_BOTTOM = 84;

/** Пауза после последнего изменения размера кадра, после которой цепочка пересобирается */
export const UPSCALE_RESIZE_SETTLE_MS = 200;

/** Непрозрачность видео под кадром улучшения */
export const UPSCALE_COVERED_VIDEO_OPACITY = 0.99;

/**
 * Уровень улучшения картинки: от лёгкого к максимальному
 */
export type UpscalePreset = 'fast' | 'balanced' | 'quality';

/**
 * Режим улучшения картинки: выключено, авто или выбранный уровень
 */
export type UpscaleMode = 'off' | 'auto' | UpscalePreset;

/**
 * Уровни от лёгкого к максимальному: порядок понижения в «Авто»
 */
export const UPSCALE_PRESETS: readonly UpscalePreset[] = [
  'fast',
  'balanced',
  'quality',
];

/**
 * Режимы в порядке показа в меню
 */
export const UPSCALE_MODES: readonly UpscaleMode[] = [
  'off',
  'auto',
  ...UPSCALE_PRESETS,
];

/**
 * С какого уровня «Авто» начинает, пока не знает видеокарту
 */
export const UPSCALE_AUTO_START_PRESET: UpscalePreset = 'quality';

/**
 * Первые кадры после сборки цепочки не замеряются: прогрев шейдеров
 */
export const UPSCALE_WARMUP_FRAMES = 15;

/**
 * Прогрев заканчивается не позже этого времени, даже если кадров меньше, мс
 */
export const UPSCALE_WARMUP_MAX_MS = 3000;

/** «Авто»: доля бюджета и доля пропусков, при которых окно замера плохое */
export const UPSCALE_AUTO_HEADROOM = 0.8;
export const UPSCALE_AUTO_OVER_BUDGET_SHARE = 0.1;

/**
 * Сколько плохих окон подряд нужно «Авто», чтобы понизить уровень
 */
export const UPSCALE_AUTO_BAD_WINDOWS = 2;

/** Во сколько бюджетов кадр, чтобы «Авто» понизило уровень сразу */
export const UPSCALE_AUTO_SEVERE_FACTOR = 4;

/**
 * Затемнение плеера в момент, когда лист страницы закрывает его целиком
 */
export const PLAYER_COVER_DIM_OPACITY = 0.55;

/**
 * Скругление верхних углов листа, наезжающего на плеер, px
 */
export const PLAYER_SHEET_RADIUS = 16;

/**
 * Зазор между слайдером эпизодов и кромкой листа, px
 */
export const PLAYER_SHEET_OFFSET = 32;

/**
 * Размер значка на месте видео в режиме «картинка в картинке», px
 */
export const PLAYER_PIP_ICON_SIZE = 64;

/**
 * Переход между страницами меню настроек: длительность, кривая и сдвиг страницы
 */
export const SETTINGS_MENU_TRANSITION_MS = 200;
export const SETTINGS_MENU_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
export const SETTINGS_MENU_SLIDE_PX = 16;

/**
 * Громкость колесом мыши в полноэкранном режиме: шаг и прокрутка на один шаг, px
 */
export const VOLUME_WHEEL_STEP = 0.1;
export const VOLUME_WHEEL_THRESHOLD = 100;

/** Селектор элементов с атрибутом data-wheel-volume-ignore */
export const WHEEL_VOLUME_IGNORE_SELECTOR = '[data-wheel-volume-ignore]';

/**
 * Уровень серии ежедневных входов по её длине
 */
export type LoginStreakTier =
  | 'week'
  | 'month'
  | 'season'
  | 'halfyear'
  | 'year'
  | 'legend';

/**
 * Серия входов показывается в комментариях с этой длины, дней
 */
export const LOGIN_STREAK_MIN_DAYS = 4;

/**
 * Верхние границы уровней серии входов, дней. Длиннее последней — легенда
 */
export const LOGIN_STREAK_TIER_LIMITS: ReadonlyArray<
  readonly [number, LoginStreakTier]
> = [
  [7, 'week'],
  [30, 'month'],
  [90, 'season'],
  [180, 'halfyear'],
  [365, 'year'],
];

/**
 * Стиль значка серии по умолчанию для каждой темы
 */
export const LOGIN_STREAK_DEFAULT_STYLES = {
  light: 'light-orange',
  dark: 'dark-ember',
} as const;

/**
 * Размер значка серии входов, px
 */
export const LOGIN_STREAK_BADGE_WIDTH = 26;
export const LOGIN_STREAK_BADGE_HEIGHT = 28;

/** Смена качества: сколько ждать заранее подгружаемый источник */
export const QUALITY_PRELOAD_TIMEOUT_MS = 4000;

/** Смена качества: сколько держать застывший кадр до первого кадра нового источника, мс */
export const QUALITY_SWITCH_FRAME_TIMEOUT_MS = 3000;

/** Смена качества: задержка индикатора загрузки поверх застывшего кадра, мс */
export const QUALITY_SWITCH_SPINNER_DELAY_MS = 1500;

/** Задержка, с которой гаснет подсветка при смене источника, мс */
export const AMBIENT_SOURCE_RESET_DELAY_MS = 500;

/**
 * Превью на полоске: шаг сетки кадров, с
 */
export const THUMBNAIL_STEP_SECONDS = 5;

/** Насколько далеко может стоять готовый кадр, показываемый размытым вместо ещё не готового */
export const THUMBNAIL_NEAREST_RADIUS = 15;

/**
 * Сколько ждать загрузки или перемотки скрытого видео превью, мс
 */
export const THUMBNAIL_SEEK_TIMEOUT_MS = 4000;

/**
 * Предел кадров превью в памяти на один источник
 */
export const THUMBNAIL_CACHE_SIZE = 800;

/** Через сколько после загрузки видео превью начинают готовиться в фоне */
export const THUMBNAIL_PRECACHE_DELAY_MS = 2000;

/**
 * Размер кадра превью на полоске, px
 */
export const THUMBNAIL_WIDTH = 240;
export const THUMBNAIL_HEIGHT = 135;

/** Сколько опорных кадров превью загружается из файла одновременно */
export const THUMBNAIL_KEYFRAME_CONCURRENCY = 3;

/**
 * Сколько заголовков боксов MP4 просматривается в поисках индекса moov
 */
export const THUMBNAIL_MOOV_MAX_HOPS = 12;

/** Хронология франшизы: предел тайтлов в обходе */
export const FRANCHISE_MAX_TITLES = 80;
export const FRANCHISE_CONCURRENCY = 1;
export const FRANCHISE_REQUEST_GAP_MS = 600;

/** Сколько шагов не по продолжениям хронология уходит от основной линии */
export const FRANCHISE_MAX_HOPS = 1;

/**
 * Пауза перед обходом после открытия плеера, мс: сначала грузится сам плеер
 */
export const FRANCHISE_START_DELAY_MS = 3000;

/**
 * Вкладка блока связанного под плеером, запоминается между запусками
 */
export const RELATED_TAB_STORAGE_KEY = 'animeLibRelatedTab';
export const RELATED_TABS = ['related', 'chronology'] as const;
export type RelatedTab = (typeof RELATED_TABS)[number];

/**
 * API Shikimori: отсюда берётся франшиза для хронологии, одним запросом
 */
export const SHIKIMORI_API_URL = 'https://shikimori.io/api';
export const SHIKIMORI_TIMEOUT_MS = 10000;

/** Сколько оценок Shikimori держать в памяти. */
export const SHIKIMORI_RATING_CACHE_LIMIT = 100;

/** Сколько результатов поиска по названию проверяется */
export const FRANCHISE_SEARCH_CANDIDATES = 3;

/** Кэш хронологий между запусками */
export const FRANCHISE_CACHE_STORAGE_KEY = 'animeLibFranchiseCache';
export const FRANCHISE_CACHE_LIMIT = 30;
export const FRANCHISE_FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const FRANCHISE_MISSING_TTL_MS = 24 * 60 * 60 * 1000;
export const FRANCHISE_CACHE_SAVE_DELAY_MS = 2000;

/** Выбор качества: «auto» или запомненное вручную значение вида «1080p». */
export const QUALITY_PREFERENCE_STORAGE_KEY = 'animeLibQualityPreference';

/** Как часто автоподбор смотрит на буфер, мс. */
export const AUTO_QUALITY_TICK_MS = 1000;

/** После смены качества или перемотки ожидание буфера не считается проблемой сети, мс. */
export const AUTO_QUALITY_GRACE_MS = 5000;

/** Сколько длится ожидание буфера при воспроизведении, чтобы понизить качество, мс. */
export const AUTO_QUALITY_STALL_MS = 1500;

/** Запас буфера, ниже которого качество понижается, если держится долго, с. */
export const AUTO_QUALITY_LOW_BUFFER_S = 3;
export const AUTO_QUALITY_LOW_BUFFER_MS = 6000;

/** Запас буфера, при котором качество повышается, если держится долго (цель буфера Shaka — 30 с). */
export const AUTO_QUALITY_HIGH_BUFFER_S = 20;
export const AUTO_QUALITY_HIGH_BUFFER_MS = 20000;

/** Минимальная пауза между автоматическими сменами качества, мс. */
export const AUTO_QUALITY_SWITCH_COOLDOWN_MS = 30000;

/** Сколько не возвращаться к качеству, на котором сеть не справилась, мс. */
export const AUTO_QUALITY_CEILING_MS = 5 * 60 * 1000;

/** Сколько размер плеера должен не меняться, чтобы подстроить под него качество, мс. */
export const AUTO_QUALITY_SIZE_SETTLE_MS = 2000;

/** Допуск: качество чуть ниже высоты плеера ещё считается достаточным. */
export const AUTO_QUALITY_SIZE_TOLERANCE = 0.9;
