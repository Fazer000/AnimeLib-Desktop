import { useEffect } from 'react';
import type { MediaCardMetadata } from '../../../utils/mediaMetadata';

interface UseMediaSessionOptions {
  isPlaying: boolean;
  currentEpisodeIndex: number;
  episodeCount: number;
  onTogglePlay: () => void;
  onEpisodeSelect: (index: number) => void;
  onEpisodeSelectWithAutoplay?: (index: number) => void;
  metadata?: MediaCardMetadata | null;
}

/** Связывает системные медиа-кнопки с плеером. */
export function useMediaSession({
  isPlaying,
  currentEpisodeIndex,
  episodeCount,
  onTogglePlay,
  onEpisodeSelect,
  onEpisodeSelectWithAutoplay,
  metadata = null,
}: UseMediaSessionOptions): void {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;

    navigator.mediaSession.setActionHandler('play', onTogglePlay);
    navigator.mediaSession.setActionHandler('pause', onTogglePlay);

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (currentEpisodeIndex < episodeCount - 1) {
        const selectWithAutoplay =
          onEpisodeSelectWithAutoplay ?? onEpisodeSelect;
        selectWithAutoplay(currentEpisodeIndex + 1);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (currentEpisodeIndex > 0) {
        onEpisodeSelect(currentEpisodeIndex - 1);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [
    onTogglePlay,
    currentEpisodeIndex,
    episodeCount,
    onEpisodeSelect,
    onEpisodeSelectWithAutoplay,
  ]);

  useEffect(() => {
    if (
      !('mediaSession' in navigator) ||
      typeof MediaMetadata === 'undefined'
    ) {
      return undefined;
    }

    navigator.mediaSession.metadata = metadata
      ? new MediaMetadata(metadata)
      : null;

    return () => {
      navigator.mediaSession.metadata = null;
    };
  }, [metadata]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);
}

export default useMediaSession;
