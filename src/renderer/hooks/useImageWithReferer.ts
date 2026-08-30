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

        if ((window as any).electron?.ipcRenderer) {
          const response = await (window as any).electron.ipcRenderer.invoke(
            'fetch-image',
            {
              url: imageUrl,
              referer,
            },
          );

          if (isCancelled) return;

          if (response.success && response.data) {
            const byteCharacters = atob(response.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i += 1) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {
              type: response.contentType || 'image/jpeg',
            });

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
