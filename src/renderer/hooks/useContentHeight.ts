import { useEffect, useState } from 'react';

/**
 * Следит за высотой элемента без задержки: возвращает callback-ref и высоту
 */
function useContentHeight(): [
  (node: HTMLElement | null) => void,
  number | null,
] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!node) {
      setHeight(null);
      return undefined;
    }

    const commit = () => setHeight(node.offsetHeight);

    commit();

    const observer = new ResizeObserver(commit);
    observer.observe(node);

    return () => observer.disconnect();
  }, [node]);

  return [setNode, height];
}

export default useContentHeight;
