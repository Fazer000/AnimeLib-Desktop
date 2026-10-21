import { useEffect, useState } from 'react';
import UpscaleRenderer from '../services/player/UpscaleRenderer';

/**
 * Доступно ли улучшение картинки: до ответа видеокарты — по наличию WebGPU
 */
function useUpscaleSupport(): boolean {
  const [supported, setSupported] = useState<boolean>(() =>
    UpscaleRenderer.isSupported(),
  );

  useEffect(() => {
    let cancelled = false;
    UpscaleRenderer.probeSupport()
      .then((result) => {
        if (!cancelled) setSupported(result);
        return result;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return supported;
}

export default useUpscaleSupport;
