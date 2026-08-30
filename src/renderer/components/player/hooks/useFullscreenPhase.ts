import { useEffect, useRef, useState, type RefObject } from 'react';
import { UIStateManager } from '../../../services/player';
import {
  PLAYER_FULLSCREEN_EASING,
  PLAYER_FULLSCREEN_TRANSITION,
} from '../../../../constants';
import { createLogger } from '../../../../shared/logger';

const log = createLogger('VideoPlayer');

type FullscreenPhase = 'enter' | 'exit' | null;

/**
 * Следит за полноэкранным режимом и отдаёт CSS-анимацию перехода.
 * Фаза живёт ровно столько, сколько идёт анимация.
 */
export function useFullscreenPhase(
  uiStateManager: UIStateManager,
  isFullscreen: boolean,
  isPlayingRef: RefObject<boolean>,
): string {
  const [phase, setPhase] = useState<FullscreenPhase>(null);
  const prevFullscreenRef = useRef<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;

      uiStateManager.setFullscreen(active);
      uiStateManager.showPlayerControls();
      uiStateManager.startAutoHide(isPlayingRef.current);

      log.debug('Player fullscreen changed:', active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [uiStateManager, isPlayingRef]);

  useEffect(() => {
    if (prevFullscreenRef.current === isFullscreen) {
      return undefined;
    }

    prevFullscreenRef.current = isFullscreen;
    setPhase(isFullscreen ? 'enter' : 'exit');

    const timer = setTimeout(
      () => setPhase(null),
      PLAYER_FULLSCREEN_TRANSITION,
    );
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  if (!phase) {
    return 'none';
  }

  const name =
    phase === 'enter' ? 'playerFullscreenEnter' : 'playerFullscreenExit';

  return `${name} ${PLAYER_FULLSCREEN_TRANSITION}ms ${PLAYER_FULLSCREEN_EASING}`;
}

export default useFullscreenPhase;
