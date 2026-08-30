import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { AutoplayManager } from '../../../services/player';
import { createLogger } from '../../../../shared/logger';

const log = createLogger('VideoPlayer');

interface UseNextEpisodeFlowOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  autoplayManager: AutoplayManager;
  autoplayEnabled: boolean;
  currentEpisodeIndex: number;
  episodeCount: number;
  /** Источник, ради которого перепривязывается автозапуск. */
  currentPlayerData: unknown;
  initialTimecode: number | null;
  timecodeAppliedRef: RefObject<boolean>;
  onEpisodeSelect: (index: number) => void;
  onEpisodeSelectWithAutoplay?: (index: number) => void;
}

/**
 * Автозапуск серии и предложение перейти к следующей.
 * Когда автопереход выключен, по окончании показывается уведомление;
 * отказ пользователя запоминается до смены серии.
 */
export function useNextEpisodeFlow({
  videoRef,
  autoplayManager,
  autoplayEnabled,
  currentEpisodeIndex,
  episodeCount,
  currentPlayerData,
  initialTimecode,
  timecodeAppliedRef,
  onEpisodeSelect,
  onEpisodeSelectWithAutoplay,
}: UseNextEpisodeFlowOptions) {
  const [showNotification, setShowNotification] = useState(false);
  const notificationShownRef = useRef(false);
  const cancelledRef = useRef(false);

  const hasNextEpisode = currentEpisodeIndex < episodeCount - 1;

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !currentPlayerData) {
      return;
    }

    autoplayManager.attachVideo(video);
    autoplayManager.setBookmarkPending(
      initialTimecode !== null && !timecodeAppliedRef.current,
    );
    autoplayManager.setupAutoplayOnLoad();
  }, [
    videoRef,
    currentPlayerData,
    initialTimecode,
    autoplayManager,
    timecodeAppliedRef,
  ]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    autoplayManager.updateConfig({ enabled: false });
    autoplayManager.setupAutoAdvance(currentEpisodeIndex, episodeCount);
  }, [
    videoRef,
    autoplayEnabled,
    currentEpisodeIndex,
    episodeCount,
    autoplayManager,
  ]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !autoplayEnabled || !hasNextEpisode) {
      return undefined;
    }

    const handleVideoEnded = () => {
      if (notificationShownRef.current) {
        return;
      }

      log.debug(
        'Video ended with autoplay disabled, showing next episode notification',
      );
      setShowNotification(true);
      notificationShownRef.current = true;
    };

    video.addEventListener('ended', handleVideoEnded);
    return () => video.removeEventListener('ended', handleVideoEnded);
  }, [videoRef, autoplayEnabled, hasNextEpisode]);

  useEffect(() => {
    notificationShownRef.current = false;
    cancelledRef.current = false;
    setShowNotification(false);
  }, [currentEpisodeIndex]);

  const cancel = useCallback(() => {
    log.debug('Next episode cancelled by user');
    cancelledRef.current = true;
    setShowNotification(false);

    videoRef.current?.pause();
  }, [videoRef]);

  const playNow = useCallback(() => {
    if (cancelledRef.current) {
      return;
    }

    setShowNotification(false);

    if (hasNextEpisode) {
      const selectWithAutoplay = onEpisodeSelectWithAutoplay ?? onEpisodeSelect;
      selectWithAutoplay(currentEpisodeIndex + 1);
    }
  }, [
    hasNextEpisode,
    currentEpisodeIndex,
    onEpisodeSelect,
    onEpisodeSelectWithAutoplay,
  ]);

  return { showNotification, cancel, playNow };
}

export default useNextEpisodeFlow;
