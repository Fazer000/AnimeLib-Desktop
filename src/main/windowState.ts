/**
 * Сохранение и восстановление геометрии и состояния главного окна
 */

import { BrowserWindow, Rectangle, screen } from 'electron';

const STORE_KEYS = {
  BOUNDS: 'windowBounds',
  MAXIMIZED: 'windowMaximized',
  FULLSCREEN: 'windowFullscreen',
} as const;

const SAVE_DELAY = 300;
const RESTORE_DELAY = 100;
const MIN_VISIBLE_SIZE = 100;

export interface WindowStore {
  get: (key: string, defaultValue?: unknown) => unknown;
  set: (key: string, value: unknown) => void;
}

/**
 * Проверяет, попадает ли окно хотя бы частично в рабочую область экранов
 */
const isVisibleOnScreen = (bounds: Rectangle): boolean =>
  screen.getAllDisplays().some(({ workArea }) => {
    const left = Math.max(bounds.x, workArea.x);
    const top = Math.max(bounds.y, workArea.y);
    const right = Math.min(
      bounds.x + bounds.width,
      workArea.x + workArea.width,
    );
    const bottom = Math.min(
      bounds.y + bounds.height,
      workArea.y + workArea.height,
    );

    return right - left >= MIN_VISIBLE_SIZE && bottom - top >= MIN_VISIBLE_SIZE;
  });

/**
 * Возвращает сохранённую геометрию окна или null, если она невалидна
 */
export const getSavedWindowBounds = (store: WindowStore): Rectangle | null => {
  const bounds = store.get(STORE_KEYS.BOUNDS, null) as Rectangle | null;

  if (
    !bounds ||
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) {
    return null;
  }

  return isVisibleOnScreen(bounds) ? bounds : null;
};

/**
 * Возвращает сохранённое состояние развёрнутого окна
 */
export const getSavedMaximized = (store: WindowStore): boolean =>
  store.get(STORE_KEYS.MAXIMIZED, false) === true;

/**
 * Возвращает сохранённое состояние полноэкранного режима окна
 */
export const getSavedFullscreen = (store: WindowStore): boolean =>
  store.get(STORE_KEYS.FULLSCREEN, false) === true;

/**
 * Восстанавливает полноэкранный режим либо развёрнутое состояние окна
 */
export const restoreWindowState = (
  window: BrowserWindow,
  store: WindowStore,
): void => {
  const fullscreen = getSavedFullscreen(store);
  const maximized = getSavedMaximized(store);

  if (!fullscreen && !maximized) {
    return;
  }

  setTimeout(() => {
    if (window.isDestroyed()) {
      return;
    }

    if (fullscreen) {
      console.log('[WindowState] Restoring fullscreen');
      window.setFullScreen(true);
      return;
    }

    console.log('[WindowState] Restoring maximized');
    window.maximize();
  }, RESTORE_DELAY);
};

/**
 * Подписывает окно на сохранение геометрии и состояния
 */
export const trackWindowState = (
  window: BrowserWindow,
  store: WindowStore,
): void => {
  // eslint-disable-next-line no-undef
  let timer: NodeJS.Timeout | null = null;

  const save = (): void => {
    if (window.isDestroyed() || window.isMinimized()) {
      return;
    }

    store.set(STORE_KEYS.BOUNDS, window.getNormalBounds());
    store.set(STORE_KEYS.MAXIMIZED, window.isMaximized());
    store.set(STORE_KEYS.FULLSCREEN, window.isFullScreen());
  };

  const saveDebounced = (): void => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(save, SAVE_DELAY);
  };

  window.on('resize', saveDebounced);
  window.on('move', saveDebounced);
  window.on('maximize', saveDebounced);
  window.on('unmaximize', saveDebounced);
  window.on('enter-full-screen', saveDebounced);
  window.on('leave-full-screen', saveDebounced);
  window.on('close', () => {
    if (timer) {
      clearTimeout(timer);
    }
    save();
  });
};
