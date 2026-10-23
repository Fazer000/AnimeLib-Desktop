import { RefObject, useEffect, useRef } from 'react';
import {
  VOLUME_WHEEL_STEP,
  VOLUME_WHEEL_THRESHOLD,
  WHEEL_VOLUME_IGNORE_SELECTOR,
} from '../../../../constants';
import { accumulateWheel, nextWheelVolume } from '../../../utils/wheelVolume';

interface UseWheelVolumeOptions {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onActivity?: () => void;
}

/** Меняет громкость колесом мыши над плеером */
export function useWheelVolume({
  containerRef,
  enabled,
  volume,
  isMuted,
  onVolumeChange,
  onActivity,
}: UseWheelVolumeOptions): void {
  const pendingRef = useRef<number>(0);
  const latestRef = useRef({ volume, isMuted, onVolumeChange, onActivity });
  latestRef.current = { volume, isMuted, onVolumeChange, onActivity };

  useEffect(() => {
    const element = containerRef.current;

    if (!enabled || !element) return undefined;

    pendingRef.current = 0;

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest(WHEEL_VOLUME_IGNORE_SELECTOR)) return;

      event.preventDefault();

      const { steps, pending } = accumulateWheel(
        pendingRef.current,
        event.deltaY,
        VOLUME_WHEEL_THRESHOLD,
      );
      pendingRef.current = pending;

      const latest = latestRef.current;

      if (steps === 0 || (latest.isMuted && steps > 0)) return;

      latest.onVolumeChange(
        nextWheelVolume(latest.volume, steps, VOLUME_WHEEL_STEP),
      );
      latest.onActivity?.();
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => element.removeEventListener('wheel', handleWheel);
  }, [containerRef, enabled]);
}

export default useWheelVolume;
