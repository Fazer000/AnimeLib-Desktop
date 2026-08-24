/* eslint-disable no-console */
import React, { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import { FolderOpenRounded } from '@mui/icons-material';
import { animeApi, AnimeInfo, Episode, Player } from '../../api/animeApi';
import { offlineStore } from '../../services/offline';
import { normalizeKodikUrl, toKodikDirectUrl } from '../../utils/kodikHelpers';
import useOfflineLibrary from '../../hooks/useOfflineLibrary';
import { QualityManager } from '../../services/player';
import EpisodeSelectionList, {
  KodikQualityMap,
  getEpisodeQualities,
  resolveEpisodeQuality,
  resolveTeamPlayer,
} from './EpisodeSelectionList';
import DownloadsList from './DownloadsList';
import OfflineLibraryTab from './OfflineLibraryTab';
import {
  DownloadRequest,
  OFFLINE_DOWNLOADABLE_PLAYER,
  OFFLINE_DOWNLOADABLE_PLAYERS,
} from '../../../constants';
import { getSiteOrigin } from '../../utils/urlHelpers';

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

const FOOTER_BUTTON_SX = {
  textTransform: 'none',
  fontSize: '0.75rem',
  color: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(255,255,255,0.18)',
  px: 1.5,
  '&:hover': {
    color: '#ffffff',
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
  },
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
  const snapshot = useOfflineLibrary();
  const hasContext = Boolean(animeId) && episodes.length > 0;

  const [tab, setTab] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [teamName, setTeamName] = useState<string>('');
  const [defaultQuality, setDefaultQuality] = useState<string>('');
  const [playersByEpisode, setPlayersByEpisode] = useState<
    Record<number, Player[]>
  >({});
  const [kodikQualities, setKodikQualities] = useState<KodikQualityMap>({});
  const [kodikLinks, setKodikLinks] = useState<
    Record<number, Record<string, Array<{ src: string }>>>
  >({});
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [qualityByEpisode, setQualityByEpisode] = useState<
    Record<number, string>
  >({});
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [migration, setMigration] = useState<string>('');
  const [notice, setNotice] = useState<{
    text: string;
    severity: 'success' | 'warning' | 'error';
  } | null>(null);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);

  useEffect(() => {
    if (!open || !animeId || animeInfo) {
      return;
    }

    animeApi
      .getAnimeInfo(animeId)
      .then((response) => setAnimeInfo(response.data))
      .catch((error) =>
        console.error('[DownloadManager] Anime info failed:', error),
      );
  }, [open, animeId, animeInfo]);

  const teams = useMemo(() => {
    const collect = (list: Player[]) =>
      list
        .filter((item) => OFFLINE_DOWNLOADABLE_PLAYERS.includes(item.player))
        .map((item) => item.team.name);

    return Array.from(
      new Set([
        ...collect(players),
        ...collect(Object.values(playersByEpisode).flat()),
      ]),
    );
  }, [players, playersByEpisode]);

  const defaultQualities = useMemo(() => {
    const all = Object.values(playersByEpisode).flatMap((list) =>
      getEpisodeQualities(list, teamName, kodikQualities),
    );

    const fromCurrent = getEpisodeQualities(players, teamName, kodikQualities);

    return Array.from(new Set([...fromCurrent, ...all])).sort(
      (a, b) => parseInt(b, 10) - parseInt(a, 10),
    );
  }, [playersByEpisode, players, teamName, kodikQualities]);

  const downloadedIds = useMemo(
    () =>
      snapshot.anime.flatMap((item) => item.episodes.map((e) => e.episodeId)),
    [snapshot],
  );

  useEffect(() => {
    if (!teamName && teams.length > 0) {
      setTeamName(teams[0]);
    }
  }, [teams, teamName]);

  useEffect(() => {
    if (
      defaultQualities.length > 0 &&
      !defaultQualities.includes(defaultQuality)
    ) {
      setDefaultQuality(defaultQualities[0]);
    }
  }, [defaultQualities, defaultQuality]);

  useEffect(() => {
    if (open) {
      offlineStore.verify();
    }
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

  const loadKodikQualities = async (list: Player[]) => {
    const targets = list.filter(
      (item) => item.player === 'Kodik' && item.src && !kodikLinks[item.id],
    );

    // eslint-disable-next-line no-restricted-syntax
    for (const player of targets) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await animeApi.getKodikVideoLinks(player.src || '');

        if (!response.success) {
          // eslint-disable-next-line no-continue
          continue;
        }

        setKodikLinks((prev) => ({ ...prev, [player.id]: response.data }));
        setKodikQualities((prev) => ({
          ...prev,
          [player.id]: Object.keys(response.data).map((item) => `${item}p`),
        }));
      } catch (error) {
        console.error(
          '[DownloadManager] Kodik links failed:',
          player.id,
          error,
        );
      }
    }
  };

  useEffect(() => {
    if (!open || players.length === 0) {
      return;
    }

    loadKodikQualities(players);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, players]);

  const loadEpisodePlayers = async (episodeId: number) => {
    setLoadingIds((prev) => [...prev, episodeId]);

    try {
      const response = await animeApi.getEpisodePlayers(episodeId);
      setPlayersByEpisode((prev) => ({
        ...prev,
        [episodeId]: response.data.players,
      }));
      await loadKodikQualities(response.data.players);
    } catch (error) {
      console.error('[DownloadManager] Players load failed:', episodeId, error);
      setPlayersByEpisode((prev) => ({ ...prev, [episodeId]: [] }));
    } finally {
      setLoadingIds((prev) => prev.filter((id) => id !== episodeId));
    }
  };

  const ensureLoaded = (ids: number[]) => {
    ids
      .filter((id) => !playersByEpisode[id] && !loadingIds.includes(id))
      .forEach((id) => loadEpisodePlayers(id));
  };

  const handleToggle = (episodeId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(episodeId)) {
        return prev.filter((id) => id !== episodeId);
      }

      ensureLoaded([episodeId]);
      return [...prev, episodeId];
    });
  };

  const handleToggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.length === episodes.length) {
        return [];
      }

      const ids = episodes.map((item) => item.id);
      ensureLoaded(ids);
      return ids;
    });
  };

  const handleDownload = async () => {
    if (selectedIds.length === 0 || !teamName) {
      return;
    }

    setIsResolving(true);

    const qualityManager = new QualityManager();
    const authToken = getAuthToken();
    const siteOrigin = getSiteOrigin();
    const releaseYear = animeInfo?.releaseDate
      ? new Date(animeInfo.releaseDate).getFullYear()
      : 0;
    const requests: DownloadRequest[] = [];

    selectedIds.forEach((episodeId) => {
      const episode = episodes.find((item) => item.id === episodeId);
      const episodePlayers = playersByEpisode[episodeId];

      if (!episode || !episodePlayers) {
        return;
      }

      const player = resolveTeamPlayer(episodePlayers, teamName);

      const qualities = getEpisodeQualities(
        episodePlayers,
        teamName,
        kodikQualities,
      );
      const quality = qualities.includes(qualityByEpisode[episodeId])
        ? qualityByEpisode[episodeId]
        : resolveEpisodeQuality(qualities, defaultQuality);

      if (!player) {
        console.warn('[DownloadManager] Skipped episode:', episode.number);
        return;
      }
      const isKodik = player.player !== OFFLINE_DOWNLOADABLE_PLAYER;

      let isHls = false;
      let primaryUrl = '';
      let fallbackUrls: string[] = [];

      if (isKodik) {
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
          const urls = qualityManager.buildAnimelibUrls(source.href);
          primaryUrl = urls.primaryUrl;
          fallbackUrls = [urls.fallbackUrl, urls.fallbackUrl2];
        }
      }

      if (!primaryUrl) {
        console.warn(
          '[DownloadManager] No source for episode:',
          episode.number,
        );
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
        playerId: player.id,
        playerType: player.player,
        teamId: player.team.id,
        teamName: player.team.name,
        translationTypeId: player.translation_type?.id ?? 0,
        translationLabel: player.translation_type?.label || '',
        quality,
        sourceType: isHls ? 'hls' : 'progressive',
        videoUrl: primaryUrl,
        fallbackUrls,
        subtitles: (player.subtitles || []).map((item) => ({
          name: item.name,
          format: item.format,
          src: item.src,
        })),
        timecode: player.timecode || [],
        authToken,
        siteOrigin,
      });
    });

    await offlineStore.enqueue(requests);

    setIsResolving(false);
    setSelectedIds([]);
    setTab(1);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#2b2b2e',
            backgroundImage: 'none',
            color: '#ffffff',
            borderRadius: 2,
            height: 'min(680px, 90vh)',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Typography sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
          Менеджер загрузок
        </Typography>

        <Tabs
          value={tab}
          onChange={(event, value) => setTab(value)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ mt: 1, minHeight: 36 }}
        >
          <Tab
            label="Скачать серии"
            disabled={!hasContext}
            sx={{ textTransform: 'none', minHeight: 36, fontSize: '0.82rem' }}
          />
          <Tab
            label="Загрузки"
            sx={{ textTransform: 'none', minHeight: 36, fontSize: '0.82rem' }}
          />
          <Tab
            label="Библиотека"
            sx={{ textTransform: 'none', minHeight: 36, fontSize: '0.82rem' }}
          />
        </Tabs>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          borderColor: 'rgba(255,255,255,0.1)',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {tab === 0 && hasContext && (
          <EpisodeSelectionList
            episodes={episodes}
            selectedIds={selectedIds}
            teams={teams}
            teamName={teamName}
            defaultQuality={defaultQuality}
            defaultQualities={defaultQualities}
            playersByEpisode={playersByEpisode}
            kodikQualities={kodikQualities}
            loadingIds={loadingIds}
            qualityByEpisode={qualityByEpisode}
            downloadedIds={downloadedIds}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
            onTeamChange={setTeamName}
            onDefaultQualityChange={(quality) => {
              setDefaultQuality(quality);
              setQualityByEpisode((prev) => {
                const next = { ...prev };
                selectedIds.forEach((id) => {
                  const available = getEpisodeQualities(
                    playersByEpisode[id],
                    teamName,
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

        {tab === 1 && <DownloadsList tasks={snapshot.tasks} />}

        {tab === 2 && (
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
        )}
      </DialogContent>

      <Box
        sx={{
          px: 3,
          height: 56,
          flexShrink: 0,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}
        >
          Папка:
        </Typography>
        <Tooltip title={snapshot.downloadsPath} arrow>
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: migration ? '#7C3AED' : 'rgba(255,255,255,0.7)',
              flex: 1,
              minWidth: 0,
            }}
            noWrap
          >
            {migration || snapshot.downloadsPath || '—'}
          </Typography>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          disabled={Boolean(migration)}
          startIcon={<FolderOpenRounded sx={{ fontSize: 16 }} />}
          onClick={handleChooseDirectory}
          sx={{ ...FOOTER_BUTTON_SX, flexShrink: 0 }}
        >
          Сменить папку
        </Button>

        <Button
          size="small"
          variant="outlined"
          disabled={Boolean(migration)}
          onClick={() => offlineStore.openDirectory()}
          sx={{ ...FOOTER_BUTTON_SX, flexShrink: 0 }}
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
          sx={{ fontSize: '0.82rem' }}
        >
          {notice?.text}
        </Alert>
      </Snackbar>

      <DialogActions
        sx={{
          px: 3,
          py: 0,
          height: 60,
          flexShrink: 0,
          boxSizing: 'border-box',
          justifyContent: 'flex-end',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ ...FOOTER_BUTTON_SX, fontSize: '0.8rem' }}
          >
            Закрыть
          </Button>

          {tab === 0 && (
            <Button
              variant="contained"
              disabled={selectedIds.length === 0 || isResolving}
              onClick={handleDownload}
              sx={{
                textTransform: 'none',
                fontSize: '0.8rem',
                backgroundColor: '#7C3AED',
                color: '#ffffff',
                '&:hover': { backgroundColor: '#6D28D9' },
                '&.Mui-disabled': {
                  backgroundColor: 'rgba(124, 58, 237, 0.25)',
                  color: 'rgba(255,255,255,0.4)',
                },
              }}
            >
              {isResolving ? 'Подготовка…' : `Скачать (${selectedIds.length})`}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default DownloadManagerDialog;
