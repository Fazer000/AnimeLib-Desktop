import { RefObject, useEffect } from 'react';
import {
  SLIDER_WHEEL_IDLE_MS,
  SLIDER_WHEEL_SCROLL_MULTIPLIER,
} from '../../constants';
import {
  dominantWheelDelta,
  nextWheelScrollTarget,
} from '../utils/wheelScroll';

/**
 * Прокручивает горизонтальную ленту колесом мыши и Shift + колесом.
 * Событие не уходит выше, чтобы не менять громкость и не листать страницу
 */
function useHorizontalWheelScroll(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const element = ref.current;

    if (!enabled || !element) return undefined;

    let target = element.scrollLeft;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!idleTimer) {
        target = element.scrollLeft;
      }

      target = nextWheelScrollTarget(
        target,
        dominantWheelDelta(event.deltaX, event.deltaY),
        SLIDER_WHEEL_SCROLL_MULTIPLIER,
        element.scrollWidth - element.clientWidth,
      );

      element.scrollTo({ left: target, behavior: 'smooth' });

      if (idleTimer) {
        clearTimeout(idleTimer);
      }

      idleTimer = setTimeout(() => {
        idleTimer = null;
      }, SLIDER_WHEEL_IDLE_MS);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);

      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [ref, enabled]);
}

export default useHorizontalWheelScroll;
