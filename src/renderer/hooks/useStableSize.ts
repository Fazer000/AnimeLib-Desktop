import { RefObject, useEffect, useState } from 'react';

interface StableSize {
  width: number;
  height: number;
}

const SETTLE_DELAY = 200;

/**
 * Как часто обновлять размер: 'settled' — после завершения ресайза,
 * 'frame' — не чаще раза за кадр, чтобы содержимое следовало за окном
 */
export type SizeUpdateMode = 'settled' | 'frame';

/**
 * Возвращает округлённый размер элемента
 */
function useStableSize(
  ref: RefObject<HTMLElement | null>,
  mode: SizeUpdateMode = 'settled',
): StableSize | null {
  const [size, setSize] = useState<StableSize | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    // eslint-disable-next-line no-undef
    let timer: NodeJS.Timeout | null = null;
    let frame: number | null = null;

    const commit = () => {
      frame = null;
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
      if (mode === 'frame') {
        if (frame === null) frame = requestAnimationFrame(commit);
        return;
      }

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
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      observer.disconnect();
    };
  }, [ref, mode]);

  return size;
}

export default useStableSize;
