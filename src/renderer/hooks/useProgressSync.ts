/* eslint-disable no-console */
import { useEffect, useRef } from 'react';
import { animeApi } from '../api/animeApi';
import { offlineStore, progressStore, viewedStore } from '../services/offline';
import { BookmarkManager } from '../services/player';
import { CONNECTIVITY_CHECK_INTERVAL_MS } from '../../constants';

/**
 * Обменивается прогрессом просмотра с сайтом при наличии связи
 */
function useProgressSync(isOnline: boolean): void {
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOnline || isSyncingRef.current) {
      return undefined;
    }

    isSyncingRef.current = true;

    const push = async () => {
      const pending = progressStore.getPending();

      if (pending.length === 0) {
        return;
      }

      console.log('[ProgressSync] Pending entries:', pending.length);

      // eslint-disable-next-line no-restricted-syntax
      for (const entry of pending) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await animeApi.saveAnimeBookmark(
            entry.animeId,
            entry.episodeId,
            BookmarkManager.secondsToTimecode(entry.seconds),
            {
              team: entry.teamId,
              translation_type: entry.translationTypeId,
              player: entry.playerType,
              item_number: entry.itemNumber,
            },
          );

          progressStore.markSynced(entry.animeId, entry.episodeId);
          console.log('[ProgressSync] Synced:', entry.animeId, entry.episodeId);
        } catch (error) {
          console.error('[ProgressSync] Failed:', entry.animeId, error);
        }
      }
    };

    const pushViews = async () => {
      const pending = viewedStore.getPending();

      if (pending.length === 0) {
        return;
      }

      console.log('[ProgressSync] Pending views:', pending.length);

      // eslint-disable-next-line no-restricted-syntax
      for (const entry of pending) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const response = await animeApi.getAnimeInfo(entry.animeId);
          const numericId = response.data?.id;

          if (!numericId) {
            // eslint-disable-next-line no-continue
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          const success = await animeApi.markPlayerViewed(
            numericId,
            entry.playerId,
          );

          if (success) {
            viewedStore.markSynced(entry.animeId, entry.playerId);
            console.log('[ProgressSync] View synced:', entry.animeId);
          }
        } catch (error) {
          console.error(
            '[ProgressSync] View sync failed:',
            entry.animeId,
            error,
          );
        }
      }
    };

    const pull = async () => {
      await offlineStore.refresh();

      const { anime } = offlineStore.getSnapshot();

      // eslint-disable-next-line no-restricted-syntax
      for (const item of anime) {
        const hasPending = progressStore
          .getPending()
          .some((entry) => entry.animeId === item.animeId);

        if (hasPending) {
          // eslint-disable-next-line no-continue
          continue;
        }

        try {
          // eslint-disable-next-line no-await-in-loop
          const response = await animeApi.getAnimeBookmark(item.animeId);
          const bookmark = response.data;

          if (!bookmark) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const episode = item.episodes.find(
            (candidate) => candidate.episodeId === bookmark.item_id,
          );

          if (!episode) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const seconds = BookmarkManager.timecodeToSeconds(bookmark.progress);
          const local = progressStore.get(item.animeId, episode.episodeId);

          if (local && Math.abs(local.seconds - seconds) < 1) {
            // eslint-disable-next-line no-continue
            continue;
          }

          progressStore.saveAt(
            {
              animeId: item.animeId,
              episodeId: episode.episodeId,
              itemNumber: episode.episodeNumber,
              seconds,
              teamId: episode.teamId,
              translationTypeId: episode.translationTypeId,
              playerType: episode.playerType,
              synced: true,
            },
            bookmark.updated_at,
          );

          console.log(
            '[ProgressSync] Pulled bookmark:',
            item.animeId,
            episode.episodeNumber,
          );
        } catch (error) {
          console.error('[ProgressSync] Pull failed:', item.animeId, error);
        }
      }
    };

    const run = async () => {
      await push();
      await pushViews();
      await pull();
      isSyncingRef.current = false;
    };

    run();

    const timer = setInterval(() => {
      const hasPending =
        progressStore.getPending().length > 0 ||
        viewedStore.getPending().length > 0;

      if (isSyncingRef.current || !hasPending) {
        return;
      }

      isSyncingRef.current = true;
      // eslint-disable-next-line promise/catch-or-return
      push()
        .then(() => pushViews())
        .finally(() => {
          isSyncingRef.current = false;
        });
    }, CONNECTIVITY_CHECK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isOnline]);
}

export default useProgressSync;
