import { useEffect, useRef, type RefObject } from 'react';
import { createLogger } from '../../../../shared/logger';

const log = createLogger('VideoPlayer');

/**
 * Считает соотношение сторон по метаданным видео и сообщает наружу.
 * Возвращает ref с последним значением для расчётов без перерисовки.
 */
export function useVideoAspectRatio(
  videoRef: RefObject<HTMLVideoElement | null>,
  resetKey: unknown,
  onChange?: (aspectRatio: number | null) => void,
): RefObject<number | null> {
  const aspectRatioRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const handleLoadedMetadata = () => {
      const { videoWidth, videoHeight } = video;

      if (videoWidth && videoHeight) {
        const aspectRatio = videoWidth / videoHeight;
        log.debug('Video aspect ratio:', aspectRatio, {
          width: videoWidth,
          height: videoHeight,
        });
        aspectRatioRef.current = aspectRatio;
        onChange?.(aspectRatio);
      } else {
        aspectRatioRef.current = null;
        onChange?.(null);
      }
    };

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, resetKey, onChange]);

  return aspectRatioRef;
}

export default useVideoAspectRatio;
