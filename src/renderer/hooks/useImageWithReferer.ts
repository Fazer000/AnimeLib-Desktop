import { useState, useEffect } from 'react';

import { createLogger } from '../../shared/logger';

const log = createLogger('useImageWithReferer');

/**
 * Hook to load images with custom referer header using Electron IPC
 */
function useImageWithReferer(imageUrl: string | undefined): string {
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!imageUrl) {
      setBlobUrl('');
      return undefined;
    }

    let objectUrl = '';
    let isCancelled = false;

    const loadImage = async () => {
      try {
        const referer = localStorage.getItem('animeLibUrl') || '';

        const api = window.electron?.electronAPI;

        if (api?.fetchImage) {
          const response = await api.fetchImage({ url: imageUrl, referer });

          if (isCancelled) return;

          if (response.success && response.data) {
            const type = response.contentType || 'image/jpeg';
            const blob = await fetch(
              `data:${type};base64,${response.data}`,
            ).then((result) => result.blob());

            if (isCancelled) return;

            objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
          } else {
            setBlobUrl(imageUrl);
          }
        } else {
          setBlobUrl(imageUrl);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        log.error('Failed to load image:', error);
        if (!isCancelled) {
          setBlobUrl(imageUrl);
        }
      }
    };

    loadImage();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  return blobUrl;
}

export default useImageWithReferer;
