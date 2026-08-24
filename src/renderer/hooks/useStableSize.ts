import { RefObject, useEffect, useState } from 'react';

interface StableSize {
  width: number;
  height: number;
}

const SETTLE_DELAY = 200;

/**
 * Возвращает размер элемента, обновляемый только после завершения ресайза
 */
function useStableSize(ref: RefObject<HTMLElement | null>): StableSize | null {
  const [size, setSize] = useState<StableSize | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    // eslint-disable-next-line no-undef
    let timer: NodeJS.Timeout | null = null;

    const commit = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      if (!width || !height) {
        return;
      }

      setSize((prev) =>
        prev && prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };

    const schedule = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(commit, SETTLE_DELAY);
    };

    commit();

    const observer = new ResizeObserver(schedule);
    observer.observe(node);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      observer.disconnect();
    };
  }, [ref]);

  return size;
}

export default useStableSize;
