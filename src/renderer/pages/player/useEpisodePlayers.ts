import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { animeApi, Episode, KodikVideoLinks, Player } from '../../api/animeApi';
import { PlayerSelectionManager } from '../../services/player';
import { offlineCatalog } from '../../services/offline';
import type { VideoPlayerRef } from '../../components/player/VideoPlayer';
import { createLogger } from '../../../shared/logger';

const log = createLogger('useEpisodePlayers');

const KODIK = 'Kodik';

interface UseEpisodePlayersOptions {
  animeId: string;
  offlineMode: boolean;
  episode: Episode | null;
  /** Пока закладка не разрешена, серию грузить рано. */
  ready: boolean;
  videoPlayerRef: RefObject<VideoPlayerRef | null>;
  playerSelectionManager: PlayerSelectionManager;
  consumeAutoplayFlag: () => boolean;
  onEpisodeApplied: (episode: Episode) => void;
}

/**
 * Озвучки серии, выбор источника и его загрузка в плеер.
 * Ответы отсекаются по номеру запроса: при быстром переключении серий
 * приходящие с опозданием данные не должны подменять текущие.
 */
export function useEpisodePlayers({
  animeId,
  offlineMode,
  episode,
  ready,
  videoPlayerRef,
  playerSelectionManager,
  consumeAutoplayFlag,
  onEpisodeApplied,
}: UseEpisodePlayersOptions) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPlayerType, setSelectedPlayerType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [kodikError, setKodikError] = useState<boolean>(false);
  const [show404, setShow404] = useState<boolean>(false);

  const requestIdRef = useRef<number>(0);
  const playerLoadedRef = useRef<boolean>(false);
  const onEpisodeAppliedRef = useRef(onEpisodeApplied);
  onEpisodeAppliedRef.current = onEpisodeApplied;

  const loadKodikLinks = useCallback(
    async (kodikSrc: string): Promise<KodikVideoLinks | null> => {
      setLoading(true);
      setKodikError(false);
      try {
        const data = await animeApi.getKodikVideoLinks(kodikSrc);
        log.debug('Loaded Kodik links:', data.success);
        if (!data.success) {
          setKodikError(true);
          return null;
        }
        return data;
      } catch (err) {
        log.error('Error loading Kodik links:', err);
        setKodikError(true);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Отдаёт источник плееру. Для Kodik сначала запрашивает ссылки и
   * отбрасывает их, если за время запроса сменилась серия.
   */
  const loadIntoPlayer = useCallback(
    async (player: Player, shouldAutoplay = false): Promise<void> => {
      const target = videoPlayerRef.current;
      if (!target) {
        return;
      }

      if (player.player !== KODIK || !player.src) {
        log.debug('Loading non-Kodik player:', player.team.name);
        target.loadPlayer(player, null, shouldAutoplay);
        return;
      }

      const requestId = requestIdRef.current;
      log.debug('Loading Kodik player');
      const kodikData = await loadKodikLinks(player.src);

      if (requestId !== requestIdRef.current) {
        log.debug('Stale Kodik links ignored');
        return;
      }

      if (kodikData) {
        target.loadPlayer(player, kodikData, shouldAutoplay);
      }
    },
    [videoPlayerRef, loadKodikLinks],
  );

  const loadEpisodePlayers = useCallback(
    async (episodeId: number, requestId: number): Promise<void> => {
      if (offlineMode) {
        const offlinePlayers = offlineCatalog.getPlayers(animeId, episodeId);
        setPlayers(offlinePlayers);
        log.debug('Offline players:', offlinePlayers.length);
        return;
      }

      setLoading(true);
      try {
        const data = await animeApi.getEpisodePlayers(episodeId);
        if (requestId !== requestIdRef.current) {
          log.debug('Stale players response ignored:', episodeId);
          return;
        }
        setPlayers(data.data.players);
        log.debug('Loaded players:', data.data.players.length);
      } catch (err) {
        log.error('Error loading players:', err);
        if (requestId === requestIdRef.current) {
          setPlayers([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [offlineMode, animeId],
  );

  /** Смена серии: сбрасываем плеер и грузим список озвучек заново. */
  useEffect(() => {
    if (!ready) {
      log.debug('Waiting for bookmark check before loading episode...');
      return;
    }

    if (!episode) {
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    log.debug('Episode change started:', episode.number);

    videoPlayerRef.current?.destroyPlayer();

    setSelectedPlayer(null);
    setSelectedPlayerType('');
    playerLoadedRef.current = false;

    onEpisodeAppliedRef.current(episode);

    loadEpisodePlayers(episode.id, requestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id, ready, loadEpisodePlayers]);

  /** Первый показ серии: источник выбирается сам, по предпочтениям или откату. */
  useEffect(() => {
    if (players.length === 0 || playerLoadedRef.current) {
      return;
    }

    const autoSelected =
      playerSelectionManager.autoSelectPlayerOrFallback(players);

    if (!autoSelected) {
      return;
    }

    log.debug(
      'Auto-selecting player:',
      autoSelected.team.name,
      autoSelected.player,
    );

    setSelectedPlayer(autoSelected);
    playerLoadedRef.current = true;

    if (!videoPlayerRef.current) {
      return;
    }

    loadIntoPlayer(autoSelected, consumeAutoplayFlag());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, playerSelectionManager, loadIntoPlayer]);

  /** Вкладка сайдбара следует за типом активного источника. */
  useEffect(() => {
    if (
      selectedPlayer &&
      players.some((item) => item.id === selectedPlayer.id)
    ) {
      setSelectedPlayerType(selectedPlayer.player);
      return;
    }

    const grouped = PlayerSelectionManager.groupPlayersByType(players);
    if (Object.keys(grouped).length === 0) {
      return;
    }

    const autoType = playerSelectionManager.autoSelectPlayerType(
      grouped,
      selectedPlayerType,
    );

    if (autoType && autoType !== selectedPlayerType) {
      setSelectedPlayerType(autoType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer, players, playerSelectionManager]);

  /** Выбор озвучки пользователем: запоминается как предпочтение. */
  const selectPlayer = useCallback(
    async (player: Player): Promise<void> => {
      log.debug('Player selected:', player.team.name, player.player);

      setShow404(false);
      setKodikError(false);
      setSelectedPlayer(player);
      playerSelectionManager.savePreference(player.team.name, player.player);

      await loadIntoPlayer(player);
    },
    [playerSelectionManager, loadIntoPlayer],
  );

  const refreshPlayer = useCallback(async (): Promise<void> => {
    if (!selectedPlayer || !videoPlayerRef.current) {
      log.warn('Cannot refresh: no player selected');
      return;
    }

    log.debug('Refreshing player');
    setShow404(false);
    setKodikError(false);

    await loadIntoPlayer(selectedPlayer);
  }, [selectedPlayer, videoPlayerRef, loadIntoPlayer]);

  const handleVideoError = useCallback((err: string): void => {
    log.error('VideoPlayer error:', err);

    if (
      err.includes('Ошибка загрузки видео') ||
      err.includes('Failed to load')
    ) {
      setShow404(true);
    }
  }, []);

  return {
    players,
    selectedPlayer,
    selectedPlayerType,
    setSelectedPlayerType,
    loading,
    kodikError,
    show404,
    selectPlayer,
    refreshPlayer,
    handleVideoError,
  };
}

export default useEpisodePlayers;
