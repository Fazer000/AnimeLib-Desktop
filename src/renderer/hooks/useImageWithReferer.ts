import { useState, useEffect } from 'react';
import LruCache from '../utils/LruCache';

import { createLogger } from '../../shared/logger';

const log = createLogger('useImageWithReferer');

const CACHE_LIMIT = 200;

const cache = new LruCache<string>(CACHE_LIMIT, (objectUrl) =>
  URL.revokeObjectURL(objectUrl),
);

const inflight = new Map<string, Promise<string>>();

/**
 * Забирает картинку через main-процесс и отдаёт ссылку на blob
 */
const loadObjectUrl = async (imageUrl: string): Promise<string> => {
  const api = window.electron?.electronAPI;

  if (!api?.fetchImage) {
    return imageUrl;
  }

  const referer = localStorage.getItem('animeLibUrl') || '';
  const response = await api.fetchImage({ url: imageUrl, referer });

  if (!response.success || !response.data) {
    return imageUrl;
  }

  const type = response.contentType || 'image/jpeg';
  const blob = await fetch(`data:${type};base64,${response.data}`).then(
    (result) => result.blob(),
  );

  const objectUrl = URL.createObjectURL(blob);
  cache.set(imageUrl, objectUrl);

  return objectUrl;
};

/**
 * Склеивает параллельные запросы одной картинки в одну загрузку
 */
const fetchObjectUrl = (imageUrl: string): Promise<string> => {
  const pending = inflight.get(imageUrl);

  if (pending) {
    return pending;
  }

  const request = loadObjectUrl(imageUrl).finally(() => {
    inflight.delete(imageUrl);
  });

  inflight.set(imageUrl, request);

  return request;
};

/**
 * Отдаёт ссылку на картинку, загружая её через main-процесс один раз
 */
function useImageWithReferer(imageUrl: string | undefined): string {
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!imageUrl) {
      setBlobUrl('');
      return undefined;
    }

    const cached = cache.get(imageUrl);

    if (cached) {
      setBlobUrl(cached);
      return undefined;
    }

    let isCancelled = false;

    const loadImage = async () => {
      try {
        const objectUrl = await fetchObjectUrl(imageUrl);

        if (!isCancelled) {
          setBlobUrl(objectUrl);
        }
      } catch (error) {
        log.error('Failed to load image:', error);

        if (!isCancelled) {
          setBlobUrl(imageUrl);
        }
      }
    };

    loadImage();

    return () => {
      isCancelled = true;
    };
  }, [imageUrl]);

  return blobUrl;
}

export default useImageWithReferer;
