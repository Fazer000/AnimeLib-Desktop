import { useCallback, useEffect, useRef, useState } from 'react';
import { animeApi, Episode } from '../../api/animeApi';
import { BookmarkManager } from '../../services/player';
import { offlineCatalog, progressStore } from '../../services/offline';
import { createLogger } from '../../../shared/logger';

const log = createLogger('useEpisodeCatalog');

interface UseEpisodeCatalogOptions {
  animeId: string;
  offlineMode: boolean;
  initialEpisodeId?: number;
  bookmarkManager: BookmarkManager;
}

/**
 * Список серий и разрешение стартовой позиции: какую серию открыть
 * и с какой секунды продолжить. Закладка сайта и локальный прогресс
 * решаются здесь же, потому что от них зависит выбор серии.
 */
export function useEpisodeCatalog({
  animeId,
  offlineMode,
  initialEpisodeId,
  bookmarkManager,
}: UseEpisodeCatalogOptions) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [initialTimecode, setInitialTimecode] = useState<number | null>(null);
  const [hasBookmark, setHasBookmark] = useState<boolean>(false);
  const [bookmarkChecked, setBookmarkChecked] = useState<boolean>(false);
  const [bookmarkedEpisodeId, setBookmarkedEpisodeId] = useState<number | null>(
    null,
  );

  const shouldAutoplayNextRef = useRef<boolean>(false);

  const loadEpisodes = useCallback(async (): Promise<void> => {
    if (!animeId) return;

    if (offlineMode) {
      const offlineEpisodes = offlineCatalog.getEpisodes(animeId);
      setEpisodes(offlineEpisodes);
      log.debug('Offline episodes:', offlineEpisodes.length);
      return;
    }

    setLoading(true);
    try {
      const data = await animeApi.getEpisodes(animeId);
      setEpisodes(data.data);
      log.debug('Loaded episodes:', data.data.length);
    } catch (err) {
      log.error('Error loading episodes:', err);
    } finally {
      setLoading(false);
    }
  }, [animeId, offlineMode]);

  /** Стартовая позиция по локальному прогрессу, без обращения к сайту. */
  const resolveOfflineStart = useCallback(
    (loadedEpisodes: Episode[]): void => {
      const latest = progressStore.getLatestForAnime(animeId);
      const progress = initialEpisodeId
        ? progressStore.get(animeId, initialEpisodeId)
        : latest;

      const targetId = initialEpisodeId ?? latest?.episodeId ?? null;
      const index = targetId
        ? loadedEpisodes.findIndex((item) => item.id === targetId)
        : -1;

      if (index >= 0) {
        setCurrentEpisodeIndex(index);
      }

      if (latest && latest.seconds > 0) {
        setBookmarkedEpisodeId(latest.episodeId);
      }

      if (progress && progress.episodeId === targetId && progress.seconds > 0) {
        setInitialTimecode(progress.seconds);
        setHasBookmark(true);
        log.debug('Offline progress:', progress.seconds);
      }

      setBookmarkChecked(true);
    },
    [animeId, initialEpisodeId],
  );

  /** Позиция для явно запрошенной серии: локальный прогресс против закладки. */
  const resolveRequestedEpisode = useCallback(
    (targetIndex: number, remoteSeconds: number | null): void => {
      const local = initialEpisodeId
        ? progressStore.get(animeId, initialEpisodeId)
        : null;
      const isSameEpisode =
        bookmarkManager.getBookmarkedEpisodeId() === initialEpisodeId;
      const remote = isSameEpisode ? remoteSeconds : null;
      const useLocal =
        Boolean(local) && (!local?.synced || local.seconds > (remote ?? 0));
      const seconds = useLocal ? (local?.seconds ?? 0) : (remote ?? 0);

      if (seconds > 0) {
        setInitialTimecode(seconds);
        setHasBookmark(true);
      }

      setBookmarkedEpisodeId(bookmarkManager.getBookmarkedEpisodeId());
      setCurrentEpisodeIndex(targetIndex);
      setBookmarkChecked(true);

      log.debug(
        'Requested episode:',
        targetIndex,
        useLocal ? 'local progress' : 'site bookmark',
        seconds,
      );
    },
    [animeId, initialEpisodeId, bookmarkManager],
  );

  const loadBookmark = useCallback(
    async (loadedEpisodes: Episode[]): Promise<void> => {
      if (!animeId || bookmarkManager.isProcessed()) {
        return;
      }

      if (offlineMode) {
        resolveOfflineStart(loadedEpisodes);
        return;
      }

      try {
        const result = await bookmarkManager.loadBookmark(
          animeId,
          loadedEpisodes,
        );

        const targetIndex = initialEpisodeId
          ? loadedEpisodes.findIndex((item) => item.id === initialEpisodeId)
          : -1;

        if (targetIndex >= 0 && initialEpisodeId) {
          resolveRequestedEpisode(targetIndex, result.timecodeSeconds);
          return;
        }

        if (result.episodeIndex !== null) {
          log.debug(
            'Bookmark found - episode:',
            result.episodeIndex,
            'timecode:',
            result.timecodeSeconds,
          );

          if (result.timecodeSeconds !== null) {
            setInitialTimecode(result.timecodeSeconds);
          }

          setHasBookmark(true);
          setBookmarkedEpisodeId(bookmarkManager.getBookmarkedEpisodeId());
          setCurrentEpisodeIndex(result.episodeIndex);
        } else {
          log.debug('No bookmark found, using first episode');
        }

        setBookmarkChecked(true);
      } catch (err) {
        log.error('Error loading bookmark:', err);
        setBookmarkChecked(true);
      }
    },
    [
      animeId,
      bookmarkManager,
      offlineMode,
      initialEpisodeId,
      resolveOfflineStart,
      resolveRequestedEpisode,
    ],
  );

  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

  useEffect(() => {
    if (episodes.length > 0 && !bookmarkManager.isProcessed()) {
      loadBookmark(episodes);
    }
  }, [episodes, bookmarkManager, loadBookmark]);

  /** Переключение серии вручную: прежняя позиция не переносится. */
  const selectEpisode = useCallback(
    (episodeIndex: number, withAutoplay = false): void => {
      if (episodeIndex === currentEpisodeIndex) {
        return;
      }

      log.debug(
        withAutoplay
          ? 'Switching to episode (from hint):'
          : 'Switching to episode (manual):',
        episodeIndex + 1,
      );

      setCurrentEpisodeIndex(episodeIndex);
      setHasBookmark(false);
      setInitialTimecode(null);

      if (withAutoplay) {
        shouldAutoplayNextRef.current = true;
      }
    },
    [currentEpisodeIndex],
  );

  /** Забирает признак автозапуска следующей серии, сбрасывая его. */
  const consumeAutoplayFlag = useCallback((): boolean => {
    const should = shouldAutoplayNextRef.current;
    shouldAutoplayNextRef.current = false;
    return should;
  }, []);

  return {
    episodes,
    currentEpisodeIndex,
    currentEpisode: episodes[currentEpisodeIndex] ?? null,
    loading,
    initialTimecode,
    setInitialTimecode,
    hasBookmark,
    setHasBookmark,
    bookmarkChecked,
    bookmarkedEpisodeId,
    setBookmarkedEpisodeId,
    selectEpisode,
    consumeAutoplayFlag,
  };
}

export default useEpisodeCatalog;
