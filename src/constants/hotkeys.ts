/**
 * Горячие клавиши плеера для окна справки
 */

/**
 * Клавиша-значок: действие колеса мыши с подписью для подсказки
 */
export interface HotkeyIconKey {
  icon: 'wheelUp' | 'wheelDown' | 'wheel';
  label: string;
  prefix?: string;
}

/**
 * Клавиша: текст на клавише либо значок
 */
export type HotkeyKey = string | HotkeyIconKey;

/**
 * Одно сочетание: подпись действия и варианты клавиш
 */
export interface HotkeyItem {
  keys: HotkeyKey[];
  label: string;
}

/**
 * Группа сочетаний с заголовком
 */
export interface HotkeyGroup {
  title: string;
  items: HotkeyItem[];
}

export const HOTKEY_GROUPS: readonly HotkeyGroup[] = [
  {
    title: 'Воспроизведение',
    items: [
      { keys: ['Space', 'K'], label: 'Пауза и продолжение' },
      { keys: ['←', 'J'], label: 'Назад на 10 секунд' },
      { keys: ['→', 'L'], label: 'Вперёд на 10 секунд' },
      { keys: ['Shift + →'], label: 'Пропуск фрагмента' },
      { keys: ['0 — 9'], label: 'Переход к 0–90% серии' },
    ],
  },
  {
    title: 'Скорость',
    items: [
      { keys: ['.'], label: 'Быстрее на 0.25×' },
      { keys: [','], label: 'Медленнее на 0.25×' },
    ],
  },
  {
    title: 'Звук',
    items: [
      {
        keys: [
          '↑',
          {
            icon: 'wheelUp',
            label: 'Колесо мыши вверх, в полноэкранном режиме',
          },
        ],
        label: 'Громче на 10%',
      },
      {
        keys: [
          '↓',
          {
            icon: 'wheelDown',
            label: 'Колесо мыши вниз, в полноэкранном режиме',
          },
        ],
        label: 'Тише на 10%',
      },
      { keys: ['M'], label: 'Выключить звук' },
    ],
  },
  {
    title: 'Интерфейс',
    items: [
      { keys: ['F'], label: 'Полноэкранный режим' },
      { keys: ['I'], label: 'Картинка в картинке' },
      { keys: ['V'], label: 'Список эпизодов' },
      { keys: ['H'], label: 'Хронология франшизы' },
      {
        keys: [
          { icon: 'wheel', prefix: 'Shift +', label: 'Shift и колесо мыши' },
        ],
        label: 'Прокрутка слайдеров',
      },
    ],
  },
];

export const HOTKEY_LAYOUT_HINT =
  'Буквенные сочетания работают и в русской раскладке.';
