import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import { FolderOpen } from '../icons';
import { animeApi, AnimeInfo, Episode, Player } from '../../api/animeApi';
import { offlineStore, sizeEstimator } from '../../services/offline';
import {
  formatSize,
  mapDownloadedEpisodes,
  sumSize,
} from '../../utils/offlineFormat';
import { normalizeKodikUrl, toKodikDirectUrl } from '../../utils/kodikHelpers';
import useOfflineLibrary from '../../hooks/useOfflineLibrary';
import { QualityManager } from '../../services/player';
import DialogCloseButton from '../DialogCloseButton';
import EpisodeSelectionList, {
  KodikQualityMap,
  getEpisodeQualities,
  getDownloadTeamOptions,
  resolveEpisodeQuality,
  resolveTeamPlayer,
} from './EpisodeSelectionList';
import DownloadsList from './DownloadsList';
import OfflineLibraryTab from './OfflineLibraryTab';
import {
  DownloadRequest,
  DownloadSource,
  isActiveDownload,
  OFFLINE_ACTIONS_HEIGHT,
  OFFLINE_DIALOG_HEIGHT,
  OFFLINE_DIALOG_MAX_WIDTH,
  OFFLINE_DOWNLOADABLE_PLAYER,
  OFFLINE_FONT,
  OFFLINE_MIN_FREE_SPACE_BYTES,
  OFFLINE_KODIK_CONCURRENCY,
  OFFLINE_PLAYERS_CONCURRENCY,
  PLAYER_TYPE_KODIK,
  DIALOG_TITLE_RIGHT_INSET,
  OFFLINE_FOOTER_HEIGHT,
  OFFLINE_ICON,
  OFFLINE_TAB_HEIGHT,
} from '../../../constants';
import { getSiteOrigin } from '../../utils/urlHelpers';
import TaskQueue from '../../utils/TaskQueue';

import { createLogger } from '../../../shared/logger';

const log = createLogger('DownloadManager');

interface DownloadManagerDialogProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line react/require-default-props
  animeId?: string;
  // eslint-disable-next-line react/require-default-props
  animeTitle?: string;
  // eslint-disable-next-line react/require-default-props
  coverUrl?: string;
  // eslint-disable-next-line react/require-default-props
  episodes?: Episode[];
  // eslint-disable-next-line react/require-default-props
  players?: Player[];
  // eslint-disable-next-line react/require-default-props
  initialTab?: number;
  // eslint-disable-next-line react/require-default-props
  onPlayOffline?: (animeId: string, episodeId?: number) => void;
}

/**
 * Возвращает токен авторизации сайта
 */
const getAuthToken = (): string => {
  try {
    const raw = localStorage.getItem('animeLibAuthToken');
    return raw ? JSON.parse(raw).access_token || '' : '';
  } catch {
    return '';
  }
};

const tabSx = (customColors: CustomColors) => ({
  textTransform: 'none' as const,
  minHeight: OFFLINE_TAB_HEIGHT,
  fontSize: OFFLINE_FONT.tab,
  color: customColors.accentTextColor,
  '&.Mui-selected': { color: customColors.accentSoftColor },
});

const footerButtonSx = (customColors: CustomColors) => ({
  textTransform: 'none',
  fontSize: OFFLINE_FONT.button,
  color: `rgba(${customColors.onSurfaceRgb}, 0.85)`,
  border: `1px solid rgba(${customColors.onSurfaceRgb}, 0.18)`,
  px: 2,
  '&:hover': {
    color: customColors.dialogTextColor,
    borderColor: customColors.accentSoftColor,
    backgroundColor: `rgba(${customColors.accentRgb}, 0.14)`,
  },
});

/** Собирает один и тот же источник для проверки размера и загрузки. */
const resolveDownloadSource = (
  player: Player,
  quality: string,
  kodikLinks: Record<number, Record<string, Array<{ src: string }>>>,
): DownloadSource | undefined => {
  let isHls = false;
  let primaryUrl = '';
  let fallbackUrls: string[] = [];

  if (player.player !== OFFLINE_DOWNLOADABLE_PLAYER) {
    const sources = kodikLinks[player.id]?.[quality.replace('p', '')] || [];
    const links = sources.map((item) => normalizeKodikUrl(item.src));
    const direct = links.map(toKodikDirectUrl).filter(Boolean);
    const chosen = direct.length > 0 ? direct : links;

    isHls = direct.length === 0;
    [primaryUrl] = chosen;
    fallbackUrls = chosen.slice(1);
  } else {
    const source = player.video?.quality?.find(
      (item) => `${item.quality}p` === quality,
    );

    if (source) {
      const urls = new QualityManager().buildAnimelibUrls(
        source.href,
        player.video_domain,
      );
      primaryUrl = urls.primaryUrl;
      fallbackUrls = [urls.fallbackUrl, urls.fallbackUrl2];
    }
  }

  if (!primaryUrl) return undefined;
  return {
    videoUrl: primaryUrl,
    fallbackUrls,
    sourceType: isHls ? 'hls' : 'progressive',
    playerType: player.player,
    authToken: getAuthToken(),
    siteOrigin: getSiteOrigin(),
  };
};

/**
 * Менеджер загрузки серий для оффлайн-просмотра
 */
function DownloadManagerDialog({
  open,
  onClose,
  animeId = '',
  animeTitle = '',
  coverUrl = '',
  episodes = [],
  players = [],
  initialTab,
  onPlayOffline,
}: DownloadManagerDialogProps) {
  const { customColors } = useTheme().palette;
  const snapshot = useOfflineLibrary();
  const hasContext = Boolean(animeId) && episodes.length > 0;

  const [tab, setTab] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [teamKey, setTeamKey] = useState<string>('');
  const [defaultQuality, setDefaultQuality] = useState<string>('');
  const [playersByEpisode, setPlayersByEpisode] = useState<
    Record<number, Player[]>
  >({});
  const [kodikQualities, setKodikQualities] = useState<KodikQualityMap>({});
  const [kodikLinks, setKodikLinks] = useState<
    Record<number, Record<string, Array<{ src: string }>>>
  >({});
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [failedIds, setFailedIds] = useState<number[]>([]);
  const [kodikPending, setKodikPending] = useState<number[]>([]);
  const [kodikFailed, setKodikFailed] = useState<number[]>([]);
  const [qualityByEpisode, setQualityByEpisode] = useState<
    Record<number, string>
  >({});
  const [sizesByUrl, setSizesByUrl] = useState<Record<string, number>>({});
  const probedSizes = useRef(new Map<string, number>());
  const sizeQueue = useRef(new TaskQueue(OFFLINE_PLAYERS_CONCURRENCY));
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [migration, setMigration] = useState<string>('');
  const [notice, setNotice] = useState<{
    text: string;
    severity: 'success' | 'warning' | 'error';
  } | null>(null);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [spaceWarning, setSpaceWarning] = useState<{
    estimated: number;
    free: number;
    requests: DownloadRequest[];
  } | null>(null);
  const lastToggledRef = useRef<number | null>(null);
  const playersQueueRef = useRef(new TaskQueue(OFFLINE_PLAYERS_CONCURRENCY));
  const kodikQueueRef = useRef(new TaskQueue(OFFLINE_KODIK_CONCURRENCY));

  useEffect(() => {
    if (!open || !animeId || animeInfo) {
      return;
    }

    animeApi
      .getAnimeInfo(animeId)
      .then((response) => setAnimeInfo(response.data))
      .catch((error) => log.error('Anime info failed:', error));
  }, [open, animeId, animeInfo]);

  const teams = useMemo(
    () =>
      getDownloadTeamOptions([
        ...players,
        ...Object.values(playersByEpisode).flat(),
      ]),
    [players, playersByEpisode],
  );

  const defaultQualities = useMemo(() => {
    const all = Object.values(playersByEpisode).flatMap((list) =>
      getEpisodeQualities(list, teamKey, kodikQualities),
    );

    const fromCurrent = getEpisodeQualities(players, teamKey, kodikQualities);

    return Array.from(new Set([...fromCurrent, ...all])).sort(
      (a, b) => parseInt(b, 10) - parseInt(a, 10),
    );
  }, [playersByEpisode, players, teamKey, kodikQualities]);

  const downloadedEpisodes = useMemo(
    () => mapDownloadedEpisodes(snapshot.anime),
    [snapshot],
  );

  const downloadedIds = useMemo(
    () => Object.keys(downloadedEpisodes).map(Number),
    [downloadedEpisodes],
  );
  const activeEpisodeIds = useMemo(
    () =>
      new Set(
        snapshot.tasks
          .filter((task) => isActiveDownload(task.status))
          .map((task) => task.episodeId),
      ),
    [snapshot.tasks],
  );
  const unavailableIds = useMemo(
    () => new Set([...downloadedIds, ...activeEpisodeIds]),
    [downloadedIds, activeEpisodeIds],
  );

  const librarySize = useMemo(
    () =>
      sumSize(
        snapshot.anime.flatMap((item) =>
          item.episodes.map((episode) => episode.fileSize),
        ),
      ),
    [snapshot],
  );
  const selectedSources = useMemo(
    () =>
      selectedIds
        .filter((id) => !unavailableIds.has(id))
        .map((id) => {
          const list = playersByEpisode[id];
          const player = resolveTeamPlayer(list, teamKey);
          const qualities = getEpisodeQualities(list, teamKey, kodikQualities);
          const quality = qualities.includes(qualityByEpisode[id])
            ? qualityByEpisode[id]
            : resolveEpisodeQuality(qualities, defaultQuality);
          return {
            quality,
            source:
              player && resolveDownloadSource(player, quality, kodikLinks),
          };
        }),
    [
      selectedIds,
      unavailableIds,
      playersByEpisode,
      teamKey,
      kodikQualities,
      qualityByEpisode,
      defaultQuality,
      kodikLinks,
    ],
  );

  useEffect(() => {
    if (!open || tab !== 0) return undefined;
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
  }, [open, tab, selectedSources]);

  const selectedSize = selectedSources.reduce(
    (total, { source, quality }) =>
      total +
      ((source && sizesByUrl[source.videoUrl]) ||
        sizeEstimator.estimateEpisode(quality)),
    0,
  );
  const approximateSize = selectedSources.some(
    ({ source }) => !source || !sizesByUrl[source.videoUrl],
  );

  useEffect(() => {
    if (teams.length > 0 && !teams.some((team) => team.key === teamKey)) {
      setTeamKey(teams[0].key);
    }
  }, [teams, teamKey]);

  useEffect(() => {
    if (
      defaultQualities.length > 0 &&
      !defaultQualities.includes(defaultQuality)
    ) {
      setDefaultQuality(defaultQualities[0]);
    }
  }, [defaultQualities, defaultQuality]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    const verifyLibrary = async () => {
      const removed = await offlineStore.verify();
      if (active && removed > 0) {
        setNotice({
          text: 'Некоторые скачанные файлы отсутствуют на диске. Библиотека обновлена.',
          severity: 'warning',
        });
      }
    };

    verifyLibrary();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(
    () =>
      offlineStore.onMigrationProgress(({ moved, total }) =>
        setMigration(total > 0 ? `Перенос ${moved} из ${total}…` : ''),
      ),
    [],
  );

  const handleChooseDirectory = async () => {
    setMigration('Выбор папки…');

    const result = await offlineStore.chooseDirectory();

    setMigration('');

    const messages: Record<string, [string, 'success' | 'warning' | 'error']> =
      {
        migrated: [
          `Библиотека перенесена · файлов: ${result?.moved ?? 0}`,
          'success',
        ],
        busy: ['Нельзя менять папку во время загрузок', 'warning'],
        'no-space': ['В целевой папке недостаточно места', 'error'],
        failed: [`Часть файлов не перенесена: ${result?.failed ?? 0}`, 'error'],
      };

    const message = result && messages[result.status];

    if (message) {
      setNotice({ text: message[0], severity: message[1] });
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const fallback = 2;
    const target = initialTab ?? fallback;

    setTab(target === 0 && !hasContext ? fallback : target);
  }, [open, hasContext, initialTab]);

  const kodikPlayerOf = (list: Player[] | undefined): Player | undefined => {
    const player = resolveTeamPlayer(list, teamKey);

    return player?.player === PLAYER_TYPE_KODIK && player.src
      ? player
      : undefined;
  };

  const loadKodikQualities = async (player: Player) => {
    setKodikPending((prev) => [...prev, player.id]);

    try {
      const response = await kodikQueueRef.current.run(() =>
        animeApi.getKodikVideoLinks(player.src || ''),
      );
      setKodikLinks((prev) => ({ ...prev, [player.id]: response.data }));
      setKodikQualities((prev) => ({
        ...prev,
        [player.id]: Object.keys(response.data).map((item) => `${item}p`),
      }));
    } catch (error) {
      log.error('Kodik links failed:', player.id, error);
      setKodikFailed((prev) => [...prev, player.id]);
    } finally {
      setKodikPending((prev) => prev.filter((id) => id !== player.id));
    }
  };

  useEffect(() => {
    if (!open) return;

    const targets = new Map<number, Player>();
    [players, ...selectedIds.map((id) => playersByEpisode[id])].forEach(
      (list) => {
        const player = kodikPlayerOf(list);
        if (
          player &&
          !kodikQualities[player.id] &&
          !kodikPending.includes(player.id) &&
          !kodikFailed.includes(player.id)
        ) {
          targets.set(player.id, player);
        }
      },
    );

    targets.forEach((player) => loadKodikQualities(player));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    players,
    selectedIds,
    playersByEpisode,
    teamKey,
    kodikQualities,
    kodikPending,
    kodikFailed,
  ]);

  const loadEpisodePlayers = async (episodeId: number) => {
    setLoadingIds((prev) => [...prev, episodeId]);
    setFailedIds((prev) => prev.filter((id) => id !== episodeId));

    try {
      await playersQueueRef.current.run(async () => {
        const response = await animeApi.getEpisodePlayers(episodeId);
        setPlayersByEpisode((prev) => ({
          ...prev,
          [episodeId]: response.data.players,
        }));
      });
    } catch (error) {
      log.error('Players load failed:', episodeId, error);
      setFailedIds((prev) => [...prev, episodeId]);
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== episodeId));
    }
  };

  const kodikBusyIds = selectedIds.filter((id) => {
    const player = kodikPlayerOf(playersByEpisode[id]);

    return (
      player && !kodikQualities[player.id] && !kodikFailed.includes(player.id)
    );
  });

  const kodikFailedIds = selectedIds.filter((id) => {
    const player = kodikPlayerOf(playersByEpisode[id]);

    return player && kodikFailed.includes(player.id);
  });

  const handleRetry = (episodeId: number) => {
    if (failedIds.includes(episodeId)) {
      loadEpisodePlayers(episodeId);
      return;
    }

    const player = kodikPlayerOf(playersByEpisode[episodeId]);
    if (player) {
      setKodikFailed((prev) => prev.filter((id) => id !== player.id));
    }
  };

  const ensureLoaded = (ids: number[]) => {
    ids
      .filter((id) => !playersByEpisode[id] && !loadingIds.includes(id))
      .forEach((id) => loadEpisodePlayers(id));
  };

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => !unavailableIds.has(id));

      return next.length === prev.length ? prev : next;
    });
  }, [unavailableIds]);

  const handleToggle = (episodeId: number, extend: boolean) => {
    if (unavailableIds.has(episodeId)) return;

    const lastId = lastToggledRef.current;
    lastToggledRef.current = episodeId;

    const from = episodes.findIndex((item) => item.id === lastId);
    const to = episodes.findIndex((item) => item.id === episodeId);

    if (extend && lastId !== null && from >= 0 && to >= 0 && from !== to) {
      const range = episodes
        .slice(Math.min(from, to), Math.max(from, to) + 1)
        .map((item) => item.id)
        .filter((id) => !unavailableIds.has(id));

      ensureLoaded(range);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...range])));
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(episodeId)) {
        return prev.filter((id) => id !== episodeId);
      }

      ensureLoaded([episodeId]);
      return [...prev, episodeId];
    });
  };

  const handleToggleAll = () => {
    const ids = episodes
      .map((item) => item.id)
      .filter((id) => !unavailableIds.has(id));

    setSelectedIds((prev) => {
      if (ids.every((id) => prev.includes(id))) {
        return [];
      }

      ensureLoaded(ids);
      return ids;
    });
  };

  const startDownload = async (requests: DownloadRequest[]) => {
    await offlineStore.enqueue(requests);
    setSelectedIds([]);
    setTab(1);
  };

  const handleDownload = async () => {
    const availableSelection = selectedIds.filter(
      (id) => !unavailableIds.has(id),
    );
    if (availableSelection.length === 0 || !teamKey) {
      return;
    }

    setIsResolving(true);

    const releaseYear = animeInfo?.releaseDate
      ? new Date(animeInfo.releaseDate).getFullYear()
      : 0;
    const requests: DownloadRequest[] = [];

    availableSelection.forEach((episodeId) => {
      const episodeOrder = episodes.findIndex((item) => item.id === episodeId);
      const episode = episodes[episodeOrder];
      const episodePlayers = playersByEpisode[episodeId];

      if (!episode || !episodePlayers) {
        return;
      }

      const player = resolveTeamPlayer(episodePlayers, teamKey);

      const qualities = getEpisodeQualities(
        episodePlayers,
        teamKey,
        kodikQualities,
      );
      const quality = qualities.includes(qualityByEpisode[episodeId])
        ? qualityByEpisode[episodeId]
        : resolveEpisodeQuality(qualities, defaultQuality);

      if (!player) {
        log.warn('Skipped episode:', episode.number);
        return;
      }

      const source = resolveDownloadSource(player, quality, kodikLinks);
      if (!source) {
        log.warn('No source for episode:', episode.number);
        return;
      }

      requests.push({
        animeId,
        animeTitle:
          animeInfo?.rus_name || animeInfo?.name || animeTitle || animeId,
        coverUrl: animeInfo?.cover?.default || coverUrl,
        animeRating: animeInfo?.rating?.averageFormated || '',
        animeYear: Number.isFinite(releaseYear) ? releaseYear : 0,
        animeTotalEpisodes: animeInfo?.items_count?.total || 0,
        episodeId,
        episodeNumber: episode.number,
        episodeName: episode.name,
        season: episode.season,
        episodeOrder,
        playerId: player.id,
        teamId: player.team.id,
        teamName: player.team.name,
        teamLogoUrl: player.team.cover?.thumbnail || '',
        translationTypeId: player.translation_type?.id ?? 0,
        translationLabel: player.translation_type?.label || '',
        quality,
        ...source,
        subtitles: (player.subtitles || []).map((item) => ({
          name: item.name,
          format: item.format,
          src: item.src,
        })),
        timecode: player.timecode || [],
      });
    });

    const estimated = requests.reduce(
      (total, request) =>
        total +
        (probedSizes.current.get(request.videoUrl) ||
          sizeEstimator.estimateEpisode(request.quality)),
      0,
    );
    const free = await offlineStore.getFreeSpace();

    setIsResolving(false);

    if (free > 0 && estimated + OFFLINE_MIN_FREE_SPACE_BYTES > free) {
      setSpaceWarning({ estimated, free, requests });
      return;
    }

    await startDownload(requests);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={OFFLINE_DIALOG_MAX_WIDTH}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: customColors.dialogColor,
            backgroundImage: 'none',
            border: `1px solid ${customColors.lineColor}`,
            color: customColors.dialogTextColor,
            borderRadius: 2,
            height: OFFLINE_DIALOG_HEIGHT,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogCloseButton onClose={onClose} />

      <DialogTitle sx={{ pb: 0, pr: `${DIALOG_TITLE_RIGHT_INSET}px` }}>
        <Typography
          sx={{ fontSize: OFFLINE_FONT.dialogTitle, fontWeight: 600 }}
        >
          Менеджер загрузок
        </Typography>

        <Tabs
          value={tab}
          onChange={(event, value) => setTab(value)}
          sx={{
            mt: 1.25,
            minHeight: OFFLINE_TAB_HEIGHT,
            '& .MuiTabs-indicator': {
              backgroundColor: customColors.accentSoftColor,
            },
          }}
        >
          {hasContext && (
            <Tab value={0} label="Скачать серии" sx={tabSx(customColors)} />
          )}
          <Tab value={1} label="Загрузки" sx={tabSx(customColors)} />
          <Tab value={2} label="Библиотека" sx={tabSx(customColors)} />
        </Tabs>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          borderColor: `rgba(${customColors.onSurfaceRgb}, 0.1)`,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          scrollbarGutter: 'stable',
          pt: 0,
        }}
      >
        {tab === 0 && hasContext && (
          <EpisodeSelectionList
            episodes={episodes}
            selectedIds={selectedIds}
            teams={teams}
            teamKey={teamKey}
            defaultQuality={defaultQuality}
            defaultQualities={defaultQualities}
            playersByEpisode={playersByEpisode}
            kodikQualities={kodikQualities}
            loadingIds={[...loadingIds, ...kodikBusyIds]}
            failedIds={[...failedIds, ...kodikFailedIds]}
            onRetry={handleRetry}
            qualityByEpisode={qualityByEpisode}
            downloadedIds={downloadedIds}
            activeEpisodeIds={activeEpisodeIds}
            downloadedEpisodes={downloadedEpisodes}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            onTeamChange={setTeamKey}
            onDefaultQualityChange={(quality) => {
              setDefaultQuality(quality);
              setQualityByEpisode((prev) => {
                const next = { ...prev };
                selectedIds.forEach((id) => {
                  const available = getEpisodeQualities(
                    playersByEpisode[id],
                    teamKey,
                    kodikQualities,
                  );
                  if (available.includes(quality)) {
                    next[id] = quality;
                  }
                });
                return next;
              });
            }}
            onEpisodeQualityChange={(episodeId, quality) =>
              setQualityByEpisode((prev) => ({ ...prev, [episodeId]: quality }))
            }
          />
        )}

        {tab === 1 && (
          <Box>
            <DownloadsList tasks={snapshot.tasks} />
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <OfflineLibraryTab
              anime={snapshot.anime}
              onPlay={
                onPlayOffline &&
                ((id, episodeId) => {
                  onPlayOffline(id, episodeId);
                  onClose();
                })
              }
            />
          </Box>
        )}
      </DialogContent>

      <Box
        sx={{
          px: 3,
          height: OFFLINE_FOOTER_HEIGHT,
          flexShrink: 0,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          minWidth: 0,
          backgroundColor: customColors.footerColor,
          borderTop: `1px solid ${customColors.lineColor}`,
        }}
      >
        <Typography
          sx={{
            fontSize: OFFLINE_FONT.hint,
            color: `rgba(${customColors.onSurfaceRgb}, 0.45)`,
          }}
        >
          Папка:
        </Typography>
        <Tooltip title={snapshot.downloadsPath} arrow>
          <Typography
            sx={{
              fontSize: OFFLINE_FONT.hint,
              color: migration
                ? customColors.accentSoftColor
                : `rgba(${customColors.onSurfaceRgb}, 0.7)`,
              flex: 1,
              minWidth: 0,
            }}
            noWrap
          >
            {migration || snapshot.downloadsPath || '—'}
          </Typography>
        </Tooltip>

        {librarySize > 0 && (
          <Typography
            sx={{
              fontSize: OFFLINE_FONT.hint,
              color: `rgba(${customColors.onSurfaceRgb}, 0.45)`,
              flexShrink: 0,
            }}
          >
            {formatSize(librarySize)}
          </Typography>
        )}

        <Button
          size="small"
          variant="outlined"
          disabled={Boolean(migration)}
          startIcon={<FolderOpen sx={{ fontSize: OFFLINE_ICON.md }} />}
          onClick={handleChooseDirectory}
          sx={{ ...footerButtonSx(customColors), flexShrink: 0 }}
        >
          Сменить папку
        </Button>

        <Button
          size="small"
          variant="outlined"
          disabled={Boolean(migration)}
          onClick={() => offlineStore.openDirectory()}
          sx={{ ...footerButtonSx(customColors), flexShrink: 0 }}
        >
          Открыть
        </Button>
      </Box>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={notice?.severity || 'info'}
          variant="filled"
          onClose={() => setNotice(null)}
          sx={{ fontSize: OFFLINE_FONT.body }}
        >
          {notice?.text}
        </Alert>
      </Snackbar>

      <DialogActions
        sx={{
          px: 3,
          py: 0,
          height: OFFLINE_ACTIONS_HEIGHT,
          flexShrink: 0,
          boxSizing: 'border-box',
          justifyContent: 'flex-end',
          backgroundColor: customColors.footerColor,
          borderTop: `1px solid ${customColors.lineColor}`,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          {tab === 0 && (
            <Button
              variant="contained"
              disabled={selectedIds.length === 0 || isResolving}
              onClick={handleDownload}
              sx={{
                textTransform: 'none',
                fontSize: OFFLINE_FONT.body,
                px: 2,
                backgroundColor: customColors.secondaryColor,
                color: customColors.onAccentColor,
                '&:hover': { backgroundColor: customColors.accentHoverColor },
                '&.Mui-disabled': {
                  backgroundColor: `rgba(${customColors.accentRgb}, 0.25)`,
                  color: `rgba(${customColors.onSurfaceRgb}, 0.4)`,
                },
              }}
            >
              {isResolving
                ? 'Подготовка…'
                : `Скачать${selectedSize > 0 ? ` (${approximateSize ? '≈ ' : ''}${formatSize(selectedSize)})` : ''}`}
            </Button>
          )}
        </Box>
      </DialogActions>

      <Dialog
        open={Boolean(spaceWarning)}
        onClose={() => setSpaceWarning(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: customColors.raisedColor,
              backgroundImage: 'none',
              border: `1px solid ${customColors.lineColor}`,
              position: 'relative',
              color: customColors.dialogTextColor,
            },
          },
        }}
      >
        <DialogCloseButton onClose={() => setSpaceWarning(null)} />

        <DialogTitle
          sx={{
            fontSize: OFFLINE_FONT.section,
            fontWeight: 600,
            pr: `${DIALOG_TITLE_RIGHT_INSET}px`,
          }}
        >
          Недостаточно места
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: OFFLINE_FONT.body }}>
            {`Для загрузки потребуется примерно ${formatSize(spaceWarning?.estimated || 0)}, свободно ${formatSize(spaceWarning?.free || 0)}.`}
          </Typography>
          <Typography
            sx={{
              fontSize: OFFLINE_FONT.caption,
              color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
              mt: 1.25,
            }}
          >
            Оценка приблизительная. Загрузка остановится, если место закончится.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              const requests = spaceWarning?.requests || [];
              setSpaceWarning(null);
              startDownload(requests);
            }}
            sx={{
              textTransform: 'none',
              fontSize: OFFLINE_FONT.button,
              px: 2,
              backgroundColor: customColors.secondaryColor,
              color: customColors.onAccentColor,
              '&:hover': { backgroundColor: customColors.accentHoverColor },
            }}
          >
            Всё равно скачать
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

export default DownloadManagerDialog;
