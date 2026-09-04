/**
 * Единственный источник цветов приложения.
 * Значения совпадают с тем, что было захардкожено по файлам, — токены только
 * дают им имена, оформление не меняется.
 */

/** Фиолетовая линейка бренда, от самой тёмной к самой светлой. */
export const ACCENT_DEEPEST = '#5B21B6';
export const ACCENT_DEEP = '#6D28D9';
export const ACCENT = '#7C3AED';
export const ACCENT_VIOLET = '#8B5CF6';
export const ACCENT_ORCHID = '#9F7AEA';
export const ACCENT_LIGHT_ALT = '#9F67FF';
export const ACCENT_MID = '#A855F7';
export const ACCENT_SOFT = '#A78BFA';
export const ACCENT_LIGHT = '#BB86FC';
export const ACCENT_BRIGHT = '#C084FC';

/** Поверхности: от самой глубокой к самой светлой. */
export const SURFACE_DEEPEST = '#0A0A0A';
export const SURFACE_DARKER = '#1A1A1A';
export const SURFACE = '#1C1C1C';
export const SURFACE_ELEVATED = '#1E1E1E';
export const SURFACE_DIALOG = '#1F1F24';
export const SURFACE_MUTED = '#2A2A2A';
export const SURFACE_RAISED = '#2B2B2E';
export const SURFACE_HEADER = '#252527';
export const SURFACE_HOVER = '#2D2D2D';

/** Текст и границы. */
export const TEXT_PRIMARY = '#BFBFBF';
export const TEXT_DISABLED = '#BDBDBD';
export const TEXT_MUTED = '#808080';
export const TEXT_DIM = '#AAAAAA';
export const TEXT_ON_LIGHT = '#212121';
export const TEXT_ON_LIGHT_MUTED = '#757575';
export const BORDER = '#464649';
export const BORDER_LIGHT = '#E0E0E0';

export const WHITE = '#FFFFFF';
export const WHITE_SHORT = '#fff';
export const BLACK = '#000000';
export const BLACK_SHORT = '#000';
export const OFF_WHITE = '#D8D8D8';
export const LILAC_TINT = '#EDE7F6';

/** Фиолетовый подмес в фоновом градиенте стартовой страницы. */
export const GRADIENT_VIOLET = '#1A0A2E';

/** Состояния: успех, предупреждение, ошибка. */
export const SUCCESS = '#4ADE80';
export const SUCCESS_MID = '#66BB6A';
export const SUCCESS_STRONG = '#4CAF50';
export const SUCCESS_DEEP = '#43A047';
export const WARNING = '#FBBF24';
export const WARNING_ORANGE = '#FF9B40';
export const DANGER_SOFT = '#F87171';
export const DANGER = '#EF5350';
export const DANGER_BRIGHT = '#EF4444';
export const DANGER_STRONG = '#D32F2F';
export const DANGER_DEEP = '#B91C1C';

/** Информационные акценты. */
export const INFO = '#2196F3';
export const INFO_DEEP = '#1976D2';
export const INFO_BRIGHT = '#3B82F6';

/** Метки качества видео. */
export const QUALITY_4K = '#F5A623';
export const QUALITY_SD = '#9CA3AF';

/** Поверхности тёмной схемы, от кадра к самой светлой ступени. */
export const DARK_SURFACE_VIDEO = '#000000';
export const DARK_SURFACE = '#0E0E10';
export const DARK_SURFACE_CONTAINER = '#16161A';
export const DARK_SURFACE_CONTAINER_HIGH = '#1C1C20';
export const DARK_SURFACE_CONTAINER_HIGHEST = '#26262A';

/** Текст тёмной схемы. */
export const DARK_ON_SURFACE = '#E6E6E8';
export const DARK_ON_SURFACE_VARIANT = '#8A8A92';
export const DARK_ON_SURFACE_MUTED = '#64646C';
export const DARK_ON_SURFACE_DISABLED = '#3E3E45';

/** Границы тёмной схемы: альфа работает на любой поверхности. */
export const DARK_OUTLINE_VARIANT = 'rgba(255, 255, 255, 0.08)';
export const DARK_OUTLINE = 'rgba(255, 255, 255, 0.16)';

/** Акцент тёмной схемы: заливка кнопок и светлый тон для текста выделения. */
export const DARK_PRIMARY = '#5E35B1';
export const DARK_PRIMARY_ACCENT = '#B39DDB';
export const DARK_PRIMARY_CONTAINER = 'rgba(94, 53, 177, 0.26)';
export const DARK_PRIMARY_QUIET = 'rgba(94, 53, 177, 0.16)';

/** Поверхности светлой схемы. Кадр остаётся чёрным в обеих. */
export const LIGHT_SURFACE_VIDEO = '#000000';
export const LIGHT_SURFACE = '#F2F2F4';
export const LIGHT_SURFACE_CONTAINER = '#FFFFFF';
export const LIGHT_SURFACE_CONTAINER_HIGH = '#E8E8EC';
export const LIGHT_SURFACE_CONTAINER_HIGHEST = '#DBDBE0';

/** Текст светлой схемы. */
export const LIGHT_ON_SURFACE = '#17171A';
export const LIGHT_ON_SURFACE_VARIANT = '#56565E';
export const LIGHT_ON_SURFACE_MUTED = '#83838C';
export const LIGHT_ON_SURFACE_DISABLED = '#B2B2B9';

/** Границы светлой схемы. */
export const LIGHT_OUTLINE_VARIANT = 'rgba(20, 18, 30, 0.10)';
export const LIGHT_OUTLINE = 'rgba(20, 18, 30, 0.20)';

/** Акцент светлой схемы: на светлом фоне он же служит цветом выделения. */
export const LIGHT_PRIMARY = '#5E35B1';
export const LIGHT_PRIMARY_ACCENT = '#5E35B1';
export const LIGHT_PRIMARY_CONTAINER = 'rgba(94, 53, 177, 0.12)';
export const LIGHT_PRIMARY_QUIET = 'rgba(94, 53, 177, 0.07)';

/** Разрушительное действие и подложка его иконки. */
export const DARK_ERROR = DANGER_BRIGHT;
export const DARK_ERROR_CONTAINER = 'rgba(239, 68, 68, 0.16)';
export const LIGHT_ERROR = '#DC2626';
export const LIGHT_ERROR_CONTAINER = 'rgba(220, 38, 38, 0.10)';

/** Успех: серия скачана, задача завершена. */
export const DARK_SUCCESS = SUCCESS;
export const LIGHT_SUCCESS = '#16A34A';

/** Метки качества светлой схемы: те же хюи, затемнённые под белый фон. */
export const LIGHT_QUALITY_4K = '#8A5406';
export const LIGHT_QUALITY_FHD = ACCENT_DEEPEST;
export const LIGHT_QUALITY_HD = '#1D4ED8';
export const LIGHT_QUALITY_SD = '#4E5561';

/** Полупрозрачные подложки и границы, ранее вписанные в тему строками. */
export const DARK_ALPHA_SURFACE = 'rgba(0, 0, 0, 0.19)';
export const DARK_ALPHA_BORDER = 'rgba(84, 84, 88, 0.44)';
export const DARK_TEXT_ACCENT = 'rgba(245, 245, 250, 0.5)';
export const DARK_TEXT_DISABLED = 'rgba(191, 191, 191, 0.5)';
export const LIGHT_ALPHA_SURFACE = 'rgba(255, 255, 255, 0.10)';
export const LIGHT_ALPHA_BORDER = 'rgba(224, 224, 224, 0.2)';
export const LIGHT_TEXT_DISABLED = 'rgba(33, 33, 33, 0.38)';

/**
 * Базовые триплеты для полупрозрачных наложений: цвет берётся от схемы,
 * а прозрачность задаётся на месте применения.
 */
export const DARK_ON_SURFACE_RGB = '255, 255, 255';
export const LIGHT_ON_SURFACE_RGB = '26, 26, 26';
export const DARK_OVERLAY_RGB = '20, 20, 20';
export const LIGHT_OVERLAY_RGB = '255, 255, 255';
export const DARK_ELEVATED_RGB = '55, 55, 55';
export const LIGHT_ELEVATED_RGB = '224, 224, 224';
export const ACCENT_RGB = '124, 58, 237';
export const DANGER_RGB = '239, 83, 80';
export const DANGER_STRONG_RGB = '211, 47, 47';
export const DANGER_SOFT_RGB = '248, 113, 113';
export const SUCCESS_RGB = '74, 222, 128';
export const SUCCESS_DEEP_RGB = '67, 160, 71';
export const SUCCESS_DARK = '#2E7D32';
export const SUCCESS_DARK_RGB = '46, 125, 50';
export const DANGER_DARK = '#C62828';
export const DANGER_DARK_RGB = '198, 40, 40';
export const WARNING_DARK = '#B45309';
export const SURFACE_HEADER_RGB = '37, 37, 39';
export const LILAC_TINT_RGB = '237, 231, 246';
export const NEUTRAL_RGB = '116, 116, 128';
