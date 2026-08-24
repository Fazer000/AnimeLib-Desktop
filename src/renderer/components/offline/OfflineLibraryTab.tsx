import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  DeleteRounded,
  ExpandMoreRounded,
  PlayArrowRounded,
  SearchRounded,
} from '@mui/icons-material';
import {
  OFFLINE_COVER,
  OFFLINE_FONT,
  OFFLINE_ICON,
  OfflineAnime,
  OfflineEpisode,
} from '../../../constants';
import {
  offlineCatalog,
  offlineStore,
  progressStore,
} from '../../services/offline';
import { formatSize, sumSize } from '../../utils/offlineFormat';

interface OfflineLibraryTabProps {
  anime: OfflineAnime[];
  // eslint-disable-next-line react/require-default-props
  onPlay?: (animeId: string, episodeId?: number) => void;
}

interface PendingRemoval {
  text: string;
  note: string;
  confirm: () => void;
}

const SEARCH_MIN_ITEMS = 2;

/**
 * Форматирует позицию просмотра
 */
const formatTime = (seconds: number): string => {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

/**
 * Сортирует скачанные серии по номеру
 */
const sortEpisodes = (episodes: OfflineEpisode[]): OfflineEpisode[] =>
  [...episodes].sort(
    (a, b) => parseFloat(a.episodeNumber) - parseFloat(b.episodeNumber),
  );

/**
 * Считает уникальные скачанные серии
 */
const countEpisodes = (episodes: OfflineEpisode[]): number =>
  new Set(episodes.map((item) => item.episodeId)).size;

/**
 * Собирает подпись серии вида «4 серия · 720p · AniDUB · 200 МБ»
 */
const buildEpisodeLabel = (episode: OfflineEpisode): string =>
  [
    `${episode.episodeNumber} серия`,
    episode.quality,
    episode.teamName,
    formatSize(episode.fileSize),
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Библиотека скачанного с поиском, запуском просмотра и удалением серий
 */
function OfflineLibraryTab({ anime, onPlay }: OfflineLibraryTabProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [query, setQuery] = useState<string>('');

  const activeFile = offlineStore.getActiveFile();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle
      ? anime.filter((item) => item.title.toLowerCase().includes(needle))
      : anime;
  }, [anime, query]);

  if (anime.length === 0) {
    return (
      <Typography
        sx={{ fontSize: OFFLINE_FONT.body, color: 'rgba(255,255,255,0.5)' }}
      >
        Библиотека пока пуста. Откройте аниме в плеере и скачайте серии для
        оффлайн просмотра.
      </Typography>
    );
  }

  return (
    <Box>
      {anime.length >= SEARCH_MIN_ITEMS && (
        <TextField
          size="small"
          fullWidth
          value={query}
          placeholder="Поиск по названию"
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded
                  sx={{
                    fontSize: OFFLINE_ICON.md,
                    color: 'rgba(255,255,255,0.45)',
                  }}
                />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQuery('')}>
                  <CloseRounded sx={{ fontSize: OFFLINE_ICON.sm }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            mb: 2,
            '& .MuiInputBase-root': {
              fontSize: OFFLINE_FONT.body,
              color: '#ffffff',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.18)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#7C3AED',
            },
          }}
        />
      )}

      {filtered.length === 0 && (
        <Typography
          sx={{ fontSize: OFFLINE_FONT.body, color: 'rgba(255,255,255,0.5)' }}
        >
          Ничего не найдено
        </Typography>
      )}

      {filtered.map((item) => {
        const episodes = sortEpisodes(item.episodes);
        const progress = progressStore.getLatestForAnime(item.animeId);
        const coverUrl = offlineCatalog.getCoverUrl(item);
        const isExpanded = expandedIds.includes(item.animeId);
        const totalSize = sumSize(item.episodes.map((one) => one.fileSize));
        const count = countEpisodes(item.episodes);
        const isPlayingHere =
          Boolean(activeFile) &&
          item.episodes.some((episode) => episode.fileName === activeFile);
        const toggle = () =>
          setExpandedIds((prev) =>
            prev.includes(item.animeId)
              ? prev.filter((id) => id !== item.animeId)
              : [...prev, item.animeId],
          );

        return (
          <Box
            key={item.animeId}
            sx={{
              mb: 2,
              pb: 2,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                onClick={toggle}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  flex: 1,
                  minWidth: 0,
                  p: 1,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    '& .library-chevron': { color: '#ffffff' },
                  },
                }}
              >
                <Box
                  sx={{
                    width: OFFLINE_COVER.width,
                    height: OFFLINE_COVER.height,
                    flexShrink: 0,
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  {coverUrl && (
                    <Box
                      component="img"
                      src={coverUrl}
                      alt=""
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: OFFLINE_FONT.title, fontWeight: 600 }}
                    noWrap
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: OFFLINE_FONT.caption,
                      color: 'rgba(255,255,255,0.5)',
                      mt: 0.25,
                    }}
                  >
                    {[
                      `${count} серий`,
                      formatSize(totalSize),
                      progress
                        ? `остановились на ${progress.itemNumber} серии (${formatTime(progress.seconds)})`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                </Box>

                <ExpandMoreRounded
                  className="library-chevron"
                  sx={{
                    fontSize: OFFLINE_ICON.lg,
                    flexShrink: 0,
                    color: 'rgba(255,255,255,0.4)',
                    transition: 'transform 0.2s, color 0.15s',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                  }}
                />
              </Box>

              {onPlay && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    <PlayArrowRounded sx={{ fontSize: OFFLINE_ICON.md }} />
                  }
                  onClick={() => onPlay(item.animeId, progress?.episodeId)}
                  sx={{
                    textTransform: 'none',
                    fontSize: OFFLINE_FONT.button,
                    px: 2,
                    py: 0.75,
                    flexShrink: 0,
                    backgroundColor: '#7C3AED',
                    color: '#ffffff',
                    '&:hover': { backgroundColor: '#6D28D9' },
                  }}
                >
                  {progress ? 'Продолжить' : 'Смотреть'}
                </Button>
              )}

              <IconButton
                sx={{
                  flexShrink: 0,
                  color: '#ef5350',
                  '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.14)' },
                }}
                onClick={() =>
                  setPending({
                    text: `Удалить «${item.title}» целиком?`,
                    note: isPlayingHere
                      ? 'Серия из этого аниме сейчас воспроизводится. При наличии сети плеер продолжит с онлайн-источника.'
                      : '',
                    confirm: () => offlineStore.removeAnime(item.animeId),
                  })
                }
              >
                <DeleteRounded sx={{ fontSize: OFFLINE_ICON.xl }} />
              </IconButton>
            </Box>

            <Collapse in={isExpanded}>
              <Box sx={{ pl: 12, pr: 0.5, pt: 0.75 }}>
                {episodes.map((episode) => (
                  <Box
                    key={`${episode.episodeId}-${episode.playerId}-${episode.quality}`}
                    onClick={() => onPlay?.(item.animeId, episode.episodeId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.25,
                      pl: 1.25,
                      pr: 0.5,
                      py: 0.5,
                      borderRadius: 1,
                      cursor: onPlay ? 'pointer' : 'default',
                      transition: 'background-color 0.12s',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        '& .episode-remove': {
                          opacity: 1,
                          color: '#ef5350',
                        },
                      },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: OFFLINE_FONT.episode,
                        flex: 1,
                        minWidth: 0,
                        color:
                          episode.fileName === activeFile ||
                          progress?.episodeId === episode.episodeId
                            ? '#7C3AED'
                            : 'rgba(255,255,255,0.75)',
                      }}
                      noWrap
                    >
                      {buildEpisodeLabel(episode)}
                    </Typography>

                    <IconButton
                      size="small"
                      className="episode-remove"
                      sx={{
                        flexShrink: 0,
                        opacity: 0.35,
                        color: 'rgba(255,255,255,0.75)',
                        transition: 'opacity 0.12s, color 0.12s',
                        '&:hover': {
                          backgroundColor: 'rgba(239, 83, 80, 0.14)',
                        },
                      }}
                      onClick={(event) => {
                        event.stopPropagation();

                        const remove = () =>
                          offlineStore.removeEpisode(
                            item.animeId,
                            episode.episodeId,
                            episode.playerId,
                            episode.quality,
                          );

                        if (episode.fileName === activeFile) {
                          setPending({
                            text: `Серия ${episode.episodeNumber} сейчас воспроизводится. Удалить файл?`,
                            note: 'При наличии сети плеер продолжит с онлайн-источника.',
                            confirm: remove,
                          });
                          return;
                        }

                        remove();
                      }}
                    >
                      <CloseRounded sx={{ fontSize: OFFLINE_ICON.sm }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}

      <Dialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#2b2b2e',
              backgroundImage: 'none',
              color: '#ffffff',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: OFFLINE_FONT.section, fontWeight: 600 }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: OFFLINE_FONT.body }}>
            {pending?.text}
          </Typography>
          {pending?.note && (
            <Typography
              sx={{
                fontSize: OFFLINE_FONT.caption,
                color: 'rgba(255,255,255,0.5)',
                mt: 1.25,
              }}
            >
              {pending.note}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPending(null)}
            sx={{
              textTransform: 'none',
              fontSize: OFFLINE_FONT.button,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              pending?.confirm();
              setPending(null);
            }}
            sx={{
              textTransform: 'none',
              fontSize: OFFLINE_FONT.button,
              px: 2,
              backgroundColor: '#ef5350',
              color: '#ffffff',
              '&:hover': { backgroundColor: '#d32f2f' },
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default OfflineLibraryTab;
