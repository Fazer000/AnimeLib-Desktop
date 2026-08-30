import { useEffect } from 'react';
import {
  PlaybackTimeStore,
  SegmentManager,
  TimeCodeSegment,
} from '../../../services/player';

/**
 * Держит менеджер сегментов в курсе таймкодов, длительности и времени.
 * Время берётся подпиской, а не пропсом, чтобы тик не задевал React.
 */
export function usePlayerSegments(
  segmentManager: SegmentManager,
  timecode: TimeCodeSegment[],
  duration: number,
  timeStore: PlaybackTimeStore,
): void {
  useEffect(() => {
    segmentManager.setSegments(timecode);
  }, [timecode, segmentManager]);

  useEffect(() => {
    segmentManager.setDuration(duration);
  }, [duration, segmentManager]);

  useEffect(() => {
    segmentManager.updateCurrentTime(timeStore.getCurrentTime());

    return timeStore.subscribe((currentTime) =>
      segmentManager.updateCurrentTime(currentTime),
    );
  }, [segmentManager, timeStore]);
}

export default usePlayerSegments;
