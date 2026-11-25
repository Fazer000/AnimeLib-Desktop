import { useEffect, useRef, useState } from 'react';
import { DownloadSource, OFFLINE_PLAYERS_CONCURRENCY } from '../../constants';
import { offlineStore } from '../services/offline';
import TaskQueue from '../utils/TaskQueue';

/** Уточняет размеры выбранных файлов с ограничением параллельных запросов. */
export default function useDownloadSizes(
  enabled: boolean,
  selectedSources: ReadonlyArray<{ source: DownloadSource | undefined }>,
): Readonly<Record<string, number>> {
  const [sizesByUrl, setSizesByUrl] = useState<Record<string, number>>({});
  const probedSizes = useRef(new Map<string, number>());
  const sizeQueue = useRef(new TaskQueue(OFFLINE_PLAYERS_CONCURRENCY));
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    selectedSources.forEach(({ source }) => {
      if (
        source?.sourceType !== 'progressive' ||
        probedSizes.current.has(source.videoUrl)
      )
        return;
      sizeQueue.current.run(async () => {
        if (cancelled || probedSizes.current.has(source.videoUrl)) return;
        const bytes = await offlineStore.probeSize(source);
        probedSizes.current.set(source.videoUrl, bytes);
        setSizesByUrl((previous) => ({
          ...previous,
          [source.videoUrl]: bytes,
        }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedSources]);

  return sizesByUrl;
}
