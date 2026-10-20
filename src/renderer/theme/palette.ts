/**
 * Единственный источник цветов приложения.
 * Значения совпадают с тем, что было захардкожено по файлам, — токены только
 * дают им имена, оформление не меняется.
 */

import type { LoginStreakTier } from '../../constants';

/** Фиолетовая линейка бренда, от самой тёмной к самой светлой. */
export const QUALITY_FHD = '#8B5CF6';

/** Поверхности: от самой глубокой к самой светлой. */
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

/** Плашка собственной оценки тайтла, как на сайте. */
export const RATING_USER_BADGE = '#3BB33B';

/** Фирменные цвета сайтов сети Lib по Site-Id, как --primary на сайтах. */
export const LIB_SITE_COLORS: Record<number, string> = {
  1: '#FF9100',
  2: '#D81B60',
  3: '#2196F3',
  4: '#F44336',
  5: '#7E57C2',
};

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
export const PRIMARY_DEEP = '#4A2A8C';
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
export const LIGHT_OUTLINE_VARIANT = 'rgba(20, 18, 30, 0.16)';
export const LIGHT_OUTLINE = 'rgba(20, 18, 30, 0.26)';

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
export const LIGHT_QUALITY_FHD = '#5B21B6';
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
export const LIGHT_ON_SURFACE_RGB = '23, 23, 26';
export const DARK_OVERLAY_RGB = '20, 20, 20';
export const LIGHT_OVERLAY_RGB = '255, 255, 255';
export const DARK_ELEVATED_RGB = '55, 55, 55';
export const LIGHT_ELEVATED_RGB = '224, 224, 224';
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
export const PRIMARY_RGB = '94, 53, 177';
export const PRIMARY_ACCENT_RGB = '179, 157, 219';
export const DARK_SURFACE_RGB = '14, 14, 16';
export const DARK_SURFACE_CONTAINER_RGB = '22, 22, 26';
export const DARK_SURFACE_CONTAINER_HIGHEST_RGB = '38, 38, 42';
export const LIGHT_SURFACE_CONTAINER_HIGHEST_RGB = '219, 219, 224';
export const LILAC_TINT_RGB = '237, 231, 246';
export const NEUTRAL_RGB = '116, 116, 128';

/**
 * Цвета значка серии входов на уровень: контур, сердцевина, число.
 * У премиальных стилей контур и сердцевина — градиенты из двух цветов
 */
export type LoginStreakSolidColors = readonly [string, string, string];
export type LoginStreakGradientColors = readonly [
  string,
  string,
  string,
  string,
  string,
];
export type LoginStreakColors =
  | LoginStreakSolidColors
  | LoginStreakGradientColors;
export type LoginStreakPalettes = Readonly<
  Record<string, Readonly<Record<LoginStreakTier, LoginStreakColors>>>
>;

/**
 * Палитры значка серии входов для тёмной темы, по стилям сайта
 */
export const LOGIN_STREAK_DARK_PALETTES: LoginStreakPalettes = {
  'dark-crimson': {
    week: ['#df4865', '#511829', '#ffc7d2'],
    month: ['#ee506d', '#5e1b2d', '#ffced8'],
    season: ['#f85a76', '#671d30', '#ffd4dc'],
    halfyear: ['#ff6780', '#721f34', '#ffd9e1'],
    year: ['#ff768b', '#81243a', '#ffe0e6'],
    legend: ['#ff8b9a', '#922a42', '#ffe7eb'],
  },
  'dark-cyan': {
    week: ['#269fd4', '#0b364e', '#c9efff'],
    month: ['#2aabdf', '#0c3d58', '#d0f2ff'],
    season: ['#34b7ed', '#0f4563', '#d8f5ff'],
    halfyear: ['#45c5fb', '#124d6e', '#def7ff'],
    year: ['#5bd1ff', '#16577b', '#e4f9ff'],
    legend: ['#76ddff', '#1a648a', '#ebfbff'],
  },
  'dark-ember': {
    week: ['#dc6f18', '#57270d', '#ffd4a3'],
    month: ['#eb7a19', '#632b0d', '#ffd9ad'],
    season: ['#f6841d', '#6b2f0d', '#ffddb5'],
    halfyear: ['#ff8f22', '#74310d', '#ffe2bd'],
    year: ['#ff9d2c', '#82380f', '#ffe7c8'],
    legend: ['#ffb23e', '#93420f', '#ffedcf'],
  },
  'dark-forest': {
    week: ['#3fbf7a', '#123f2b', '#cff6df'],
    month: ['#48cc84', '#164930', '#d7f9e5'],
    season: ['#54d88f', '#195337', '#defbea'],
    halfyear: ['#63e39d', '#1d5f3f', '#e5fdef'],
    year: ['#76edac', '#226b48', '#ecfff4'],
    legend: ['#8ff8bf', '#287a54', '#f2fff8'],
  },
  'dark-gold': {
    week: ['#d6a529', '#4d3a0d', '#ffe9b5'],
    month: ['#e3b02d', '#59420f', '#ffedbf'],
    season: ['#efbd35', '#664c12', '#fff1c8'],
    halfyear: ['#facb43', '#735715', '#fff4d0'],
    year: ['#ffd95a', '#806419', '#fff7da'],
    legend: ['#ffe774', '#90721f', '#fffbe6'],
  },
  'dark-red': {
    week: ['#f0423f', '#551315', '#ffd0ce'],
    month: ['#ff4b47', '#621719', '#ffd7d4'],
    season: ['#ff5952', '#6f1b1d', '#ffddda'],
    halfyear: ['#ff6a60', '#7d2021', '#ffe3df'],
    year: ['#ff7d70', '#8d2828', '#ffe9e5'],
    legend: ['#ff9585', '#a1312f', '#fff0eb'],
  },
  'dark-violet': {
    week: ['#9a74ff', '#322057', '#e3d8ff'],
    month: ['#a57fff', '#392661', '#e7ddff'],
    season: ['#b08bff', '#422c6e', '#ebe3ff'],
    halfyear: ['#bd9aff', '#4b347a', '#efe8ff'],
    year: ['#cbaaff', '#563c87', '#f3eeff'],
    legend: ['#dcbfff', '#624796', '#f8f4ff'],
  },
  'premium-acid': {
    week: ['#c7ff33', '#28e4a6', '#46530d', '#104a37', '#faffde'],
    month: ['#ceff45', '#35e9ad', '#4c5a0f', '#12513d', '#fbffe3'],
    season: ['#d7ff5c', '#48efb7', '#536311', '#155a46', '#fcffe8'],
    halfyear: ['#e0ff78', '#63f5c3', '#5d6f16', '#196652', '#fdffed'],
    year: ['#e9ff98', '#86fbd1', '#6a7e1d', '#1f7460', '#fefff5'],
    legend: ['#f4ffbe', '#b7ffe5', '#799026', '#278672', '#ffffff'],
  },
  'premium-ice': {
    week: ['#f2fbff', '#63b6ff', '#2a4d68', '#1f3f6d', '#ffffff'],
    month: ['#f5fcff', '#72beff', '#2d5370', '#214576', '#ffffff'],
    season: ['#f8fdff', '#82c8ff', '#325b7a', '#255081', '#ffffff'],
    halfyear: ['#fbfeff', '#97d4ff', '#376787', '#2a5c8f', '#ffffff'],
    year: ['#fdffff', '#afe2ff', '#3d7596', '#316a9f', '#ffffff'],
    legend: ['#ffffff', '#cdf0ff', '#4687a9', '#397ab2', '#ffffff'],
  },
  'premium-molten': {
    week: ['#ff893c', '#ff4fa6', '#582b16', '#581937', '#fff0e6'],
    month: ['#ff9346', '#ff59ad', '#613018', '#611b3c', '#fff3ea'],
    season: ['#ff9f55', '#ff67b7', '#6c351b', '#6b1f43', '#fff6ef'],
    halfyear: ['#ffad68', '#ff79c3', '#7a3d20', '#78254d', '#fff9f4'],
    year: ['#ffbf82', '#ff93d0', '#894827', '#89305a', '#fffbf8'],
    legend: ['#ffd8a7', '#ffb9e2', '#9b5630', '#9d3c6a', '#ffffff'],
  },
  'premium-neon': {
    week: ['#46e4ff', '#8b5bff', '#103a54', '#2f1f5f', '#eef7ff'],
    month: ['#54e8ff', '#9466ff', '#11405b', '#342266', '#f1f9ff'],
    season: ['#67edff', '#a073ff', '#124764', '#3a2770', '#f5fbff'],
    halfyear: ['#7cf2ff', '#ae83ff', '#14506f', '#432e7d', '#f8fcff'],
    year: ['#9af7ff', '#bf99ff', '#175b7d', '#4d378d', '#fbfeff'],
    legend: ['#c6fcff', '#d8c1ff', '#1b6a8f', '#5c43a1', '#ffffff'],
  },
  'premium-night': {
    week: ['#ff65d5', '#7e6bff', '#491b48', '#2b235d', '#fff1ff'],
    month: ['#ff71d9', '#8775ff', '#511f50', '#302762', '#fff4ff'],
    season: ['#ff7edf', '#9483ff', '#5a235a', '#362d6b', '#fff7ff'],
    halfyear: ['#ff8ee7', '#a392ff', '#652865', '#3f3477', '#fff9ff'],
    year: ['#ffa5ef', '#b7a8ff', '#742f73', '#4a3e86', '#fffbff'],
    legend: ['#ffc9f7', '#d3c8ff', '#873884', '#584b99', '#ffffff'],
  },
  'premium-red': {
    week: ['#ff3348', '#b9143f', '#5b121b', '#421022', '#ffe3e5'],
    month: ['#ff4150', '#c71a47', '#661620', '#4b1327', '#ffe7e9'],
    season: ['#ff515a', '#d52250', '#731b27', '#56172d', '#ffebed'],
    halfyear: ['#ff6568', '#e32e5c', '#82222f', '#641d35', '#fff0f1'],
    year: ['#ff7d78', '#f03f6b', '#932b3a', '#742541', '#fff5f5'],
    legend: ['#ff9a8e', '#ff5b7f', '#a93747', '#892f4d', '#ffffff'],
  },
};

/**
 * Палитры значка серии входов для светлой темы, по стилям сайта
 */
export const LOGIN_STREAK_LIGHT_PALETTES: LoginStreakPalettes = {
  'light-coral': {
    week: ['#bd5860', '#f4b9ba', '#7f2d34'],
    month: ['#ce6068', '#f8c1c2', '#842f36'],
    season: ['#dd686e', '#fac9c9', '#8a3037'],
    halfyear: ['#e87578', '#ffd3d2', '#8f3036'],
    year: ['#f2817a', '#ffdbd6', '#963135'],
    legend: ['#ff927e', '#ffe2d9', '#9a3434'],
  },
  'light-lavender': {
    week: ['#8068c8', '#d2c9f2', '#4e3c8b'],
    month: ['#8d73d3', '#d9d0f5', '#554294'],
    season: ['#9a80dc', '#e0d8f7', '#5c499c'],
    halfyear: ['#a78ee5', '#e7dff9', '#634fa5'],
    year: ['#b79ff0', '#eee7fc', '#6a56ad'],
    legend: ['#c9b6fa', '#f4efff', '#725fb7'],
  },
  'light-lime': {
    week: ['#75a331', '#d3eaa6', '#496b13'],
    month: ['#82b238', '#dbefb1', '#507416'],
    season: ['#90c241', '#e3f4bd', '#577d18'],
    halfyear: ['#9fd04d', '#eaf8c9', '#5e861b'],
    year: ['#b0dd5e', '#f0fbd5', '#668f1f'],
    legend: ['#c3eb73', '#f7ffe1', '#6f9924'],
  },
  'light-mint': {
    week: ['#2f8f86', '#aee4dc', '#0f5b54'],
    month: ['#349c90', '#b8ebe2', '#11615a'],
    season: ['#3aa89b', '#c2f0e7', '#12665e'],
    halfyear: ['#42b6a4', '#c9f3ea', '#146a61'],
    year: ['#4ec5ad', '#d3f7ef', '#166f64'],
    legend: ['#63d8b8', '#ddfbf3', '#177467'],
  },
  'light-orange': {
    week: ['#a54f1f', '#e9ba7d', '#7a3509'],
    month: ['#bf611d', '#efc382', '#803a0b'],
    season: ['#d56d14', '#f3ca82', '#873e0c'],
    halfyear: ['#e27a0d', '#f7d287', '#8a410d'],
    year: ['#f08c00', '#fad98d', '#8a410d'],
    legend: ['#ffab00', '#fee29a', '#8a410d'],
  },
  'light-red': {
    week: ['#c73a2f', '#f5b5ae', '#862018'],
    month: ['#d64437', '#f9c0b9', '#8c241b'],
    season: ['#e24f41', '#fbcac3', '#94291f'],
    halfyear: ['#ec5d4c', '#ffd4cc', '#9c2e23'],
    year: ['#f76e59', '#ffded5', '#a53427'],
    legend: ['#ff846b', '#ffe9df', '#ad3b2b'],
  },
  'light-sky': {
    week: ['#3f86c6', '#b9daf5', '#1c578a'],
    month: ['#4694d4', '#c3e1f8', '#1f5f94'],
    season: ['#51a2df', '#cde8fb', '#23679d'],
    halfyear: ['#5fb0e9', '#d8eefc', '#2670a8'],
    year: ['#72bff1', '#e1f3fe', '#2978b1'],
    legend: ['#8bd0fb', '#eaf8ff', '#2b80bb'],
  },
  'premium-berry': {
    week: ['#d044b7', '#ff6c8f', '#ffe0f6', '#ffe8ef', '#862558'],
    month: ['#d94cc0', '#ff7496', '#ffe4f7', '#ffebf1', '#8d285d'],
    season: ['#e258c8', '#ff7f9f', '#ffe8f9', '#ffeef4', '#962d65'],
    halfyear: ['#ea67d0', '#ff8dac', '#ffedfb', '#fff2f7', '#a0336f'],
    year: ['#f07ad8', '#ffa0bb', '#fff2fc', '#fff6fa', '#ab3c7b'],
    legend: ['#f79ae3', '#ffbdd1', '#fff8fe', '#fffafd', '#b74989'],
  },
  'premium-lime': {
    week: ['#72c81d', '#d1e53f', '#eefec9', '#fffedc', '#56660d'],
    month: ['#7acd20', '#d7e946', '#f1ffcf', '#fffede', '#5a6b0f'],
    season: ['#84d524', '#ddef52', '#f4ffd6', '#fffedf', '#617312'],
    halfyear: ['#91dd2d', '#e5f362', '#f7ffdf', '#ffffe6', '#697d15'],
    year: ['#a2e841', '#edf87b', '#fbffe8', '#ffffee', '#748a19'],
    legend: ['#bbf25d', '#f7ff9f', '#fdffef', '#fffff5', '#80991e'],
  },
  'premium-polar': {
    week: ['#6d5cff', '#2fc7d8', '#efe8ff', '#e8fdff', '#28466d'],
    month: ['#7663ff', '#37cedf', '#f1ebff', '#ebfdff', '#2a4972'],
    season: ['#8170ff', '#45d5e5', '#f3efff', '#effeff', '#2d4d77'],
    halfyear: ['#8e7fff', '#58ddee', '#f6f3ff', '#f3feff', '#31527d'],
    year: ['#9f92ff', '#72e6f6', '#f9f7ff', '#f7ffff', '#355983'],
    legend: ['#b7acff', '#93f1ff', '#fcfbff', '#fbffff', '#396089'],
  },
  'premium-red': {
    week: ['#c7192b', '#e84a38', '#f7c7ca', '#ffd4cc', '#731316'],
    month: ['#d01e2e', '#ef5540', '#facdd0', '#ffd9d0', '#7a1618'],
    season: ['#db2533', '#f55f48', '#ffd3d5', '#ffded5', '#821a1b'],
    halfyear: ['#e3303b', '#fb6d55', '#ffdadd', '#ffe4dc', '#8b2020'],
    year: ['#ed4048', '#ff7f65', '#ffe2e4', '#ffece5', '#942725'],
    legend: ['#f75a5c', '#ff9880', '#ffecee', '#fff3ee', '#a1322e'],
  },
  'premium-sunset': {
    week: ['#ff6868', '#ffb14a', '#ffe1da', '#fff1dc', '#8d401d'],
    month: ['#ff7063', '#ffb953', '#ffe5de', '#fff3e0', '#94441f'],
    season: ['#ff7a62', '#ffc260', '#ffe8e1', '#fff5e5', '#9b4a22'],
    halfyear: ['#ff8765', '#ffcc72', '#ffede7', '#fff8ea', '#a45126'],
    year: ['#ff9870', '#ffd98b', '#fff2ee', '#fffbee', '#af5a2b'],
    legend: ['#ffaf84', '#ffe8ab', '#fff7f5', '#fffdf5', '#bb6732'],
  },
  'premium-tropic': {
    week: ['#00a8a8', '#4479ff', '#ddfff8', '#edf1ff', '#174f7d'],
    month: ['#00b1b1', '#4e83ff', '#e2fffa', '#eff3ff', '#195485'],
    season: ['#00bcbc', '#5a8fff', '#e8fffc', '#f2f5ff', '#1c5b8e'],
    halfyear: ['#0acaca', '#699cff', '#edfffd', '#f5f8ff', '#206598'],
    year: ['#24d9d7', '#81adff', '#f2ffff', '#f8fbff', '#2471a4'],
    legend: ['#49ebe7', '#9ac1ff', '#f7ffff', '#fbfdff', '#287eb1'],
  },
};
