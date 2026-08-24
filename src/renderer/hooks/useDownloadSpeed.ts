import { useEffect, useRef, useState } from 'react';
import { DownloadTask } from '../../constants';

interface Sample {
  bytes: number;
  time: number;
  speed: number;
}

const SMOOTHING = 0.35;

/**
 * Считает сглаженную скорость активных загрузок, байт/с
 */
function useDownloadSpeed(tasks: DownloadTask[]): Record<string, number> {
  const samples = useRef<Map<string, Sample>>(new Map());
  const [speeds, setSpeeds] = useState<Record<string, number>>({});

  useEffect(() => {
    const now = Date.now();
    const next: Record<string, number> = {};

    tasks.forEach((task) => {
      if (task.status !== 'downloading') {
        samples.current.delete(task.id);
        return;
      }

      const prev = samples.current.get(task.id);
      const deltaBytes = prev ? task.loadedBytes - prev.bytes : 0;
      const deltaSeconds = prev ? (now - prev.time) / 1000 : 0;
      const instant =
        deltaBytes > 0 && deltaSeconds > 0 ? deltaBytes / deltaSeconds : 0;
      const previous = prev?.speed || 0;
      const speed =
        instant > 0
          ? previous * (1 - SMOOTHING) + instant * SMOOTHING
          : previous;

      samples.current.set(task.id, {
        bytes: task.loadedBytes,
        time: now,
        speed,
      });

      if (speed > 0) {
        next[task.id] = speed;
      }
    });

    setSpeeds(next);
  }, [tasks]);

  return speeds;
}

export default useDownloadSpeed;
