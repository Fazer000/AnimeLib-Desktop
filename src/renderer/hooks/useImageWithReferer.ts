import { useState, useEffect } from 'react';

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
        // Get referer from localStorage
        const referer = localStorage.getItem('animeLibUrl') || '';

        // Try to use Electron IPC if available
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
            // Convert base64 to blob
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
            // Fallback to direct image URL
            setBlobUrl(imageUrl);
          }
        } else {
          // Fallback to direct image URL if Electron IPC is not available
          setBlobUrl(imageUrl);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[useImageWithReferer] Failed to load image:', error);
        // Fallback to direct image URL on error
        if (!isCancelled) {
          setBlobUrl(imageUrl);
        }
      }
    };

    loadImage();

    // Cleanup
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
