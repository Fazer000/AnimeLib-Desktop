/**
 * Направление и анимация перехода между страницами меню настроек
 */
import type { MenuPage } from './types';

export type MenuDirection = 'none' | 'forward' | 'back';

export const SLIDE_FORWARD = 'settingsSlideForward';
export const SLIDE_BACK = 'settingsSlideBack';

/**
 * Возврат на главную страницу идёт назад, уход на вложенную — вперёд
 */
export function getMenuDirection(to: MenuPage): MenuDirection {
  return to === 'main' ? 'back' : 'forward';
}

/**
 * Имя анимации входа страницы; без направления страница появляется без анимации
 */
export function getPageAnimationName(direction: MenuDirection): string | null {
  if (direction === 'forward') return SLIDE_FORWARD;
  if (direction === 'back') return SLIDE_BACK;

  return null;
}
