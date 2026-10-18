import { useEffect } from 'react';
import type { ThumbnailManager } from '../../../services/player';
import { THUMBNAIL_PRECACHE_DELAY_MS } from '../../../../constants';

/**
 * Запускает фоновую подготовку превью вскоре после загрузки видео, ещё до
 * начала просмотра, чтобы к первому наведению на полоску кадры уже были
 */
export function useThumbnailPrecache(
  thumbnailManager: ThumbnailManager | null,
  duration: number,
): void {
  useEffect(() => {
    if (!thumbnailManager || duration <= 0) {
      return undefined;
    }

    const timer = setTimeout(
      () => thumbnailManager.startPreCaching(duration),
      THUMBNAIL_PRECACHE_DELAY_MS,
    );

    return () => clearTimeout(timer);
  }, [thumbnailManager, duration]);
}

export default useThumbnailPrecache;
