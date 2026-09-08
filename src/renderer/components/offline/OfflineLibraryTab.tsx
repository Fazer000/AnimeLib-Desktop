import React, { useMemo, useRef, useState } from 'react';
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
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CloseRounded,
  DeleteRounded,
  ExpandMoreRounded,
  PlayArrowRounded,
  SearchOffRounded,
  SearchRounded,
  VideoLibraryRounded,
} from '@mui/icons-material';
import {
  DIALOG_TITLE_RIGHT_INSET,
  OFFLINE_COVER,
  OFFLINE_FONT,
  OFFLINE_ICON,
  OFFLINE_LIBRARY_ACTION_WIDTH,
  OfflineAnime,
  OfflineEpisode,
} from '../../../constants';
import {
  offlineCatalog,
  offlineStore,
  progressStore,
} from '../../services/offline';
import { formatSize, sumSize } from '../../utils/offlineFormat';
import DialogCloseButton from '../DialogCloseButton';
import EmptyState from './EmptyState';

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
  const { customColors } = useTheme().palette;
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const shownRef = useRef<PendingRemoval | null>(null);
  const [query, setQuery] = useState<string>('');

  if (pending) {
    shownRef.current = pending;
  }

  const shown = pending || shownRef.current;

  const activeFile = offlineStore.getActiveFile();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle
      ? anime.filter((item) => item.title.toLowerCase().includes(needle))
      : anime;
  }, [anime, query]);

  if (anime.length === 0) {
    return (
      <EmptyState
        icon={<VideoLibraryRounded />}
        text="Библиотека пока пуста. Откройте аниме в плеере и скачайте серии для оффлайн просмотра."
      />
    );
  }

  return (
    <Box sx={{ pt: anime.length >= SEARCH_MIN_ITEMS ? 0 : 2 }}>
      {anime.length >= SEARCH_MIN_ITEMS && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            mx: -3,
            px: 3,
            pt: 2,
            pb: 2,
            backgroundColor: customColors.dialogColor,
          }}
        >
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
                      color: `rgba(${customColors.onSurfaceRgb}, 0.45)`,
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
              '& .MuiInputBase-root': {
                fontSize: OFFLINE_FONT.body,
                color: customColors.dialogTextColor,
                backgroundColor: customColors.dialogColor,
              },
              '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                borderColor: customColors.borderColor,
              },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                {
                  borderColor: customColors.accentSoftColor,
                },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                {
                  borderColor: customColors.accentSoftColor,
                  borderWidth: 1,
                },
            }}
          />
        </Box>
      )}

      {filtered.length === 0 && (
        <EmptyState icon={<SearchOffRounded />} text="Ничего не найдено" />
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
              borderBottom: `1px solid rgba(${customColors.onSurfaceRgb}, 0.06)`,
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
                    backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.07)`,
                    '& .library-chevron': {
                      color: customColors.dialogTextColor,
                    },
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
                    backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.08)`,
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
                      color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
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
                    color: `rgba(${customColors.onSurfaceRgb}, 0.4)`,
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
                    minWidth: OFFLINE_LIBRARY_ACTION_WIDTH,
                    whiteSpace: 'nowrap',
                    backgroundColor: customColors.secondaryColor,
                    color: customColors.onAccentColor,
                    '&:hover': {
                      backgroundColor: customColors.accentHoverColor,
                    },
                  }}
                >
                  {progress ? 'Продолжить' : 'Смотреть'}
                </Button>
              )}

              <Tooltip title="Удалить всё скачанное" arrow>
                <IconButton
                  sx={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    color: customColors.accentTextColor,
                    backgroundColor: customColors.mutedColor,
                    transition: 'background-color 0.15s, color 0.15s',
                    '&:hover': {
                      color: customColors.dangerColor,
                      backgroundColor: `rgba(${customColors.dangerRgb}, 0.14)`,
                    },
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
                  <DeleteRounded sx={{ fontSize: OFFLINE_ICON.lg }} />
                </IconButton>
              </Tooltip>
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
                        backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.07)`,
                        '& .episode-remove': {
                          opacity: 1,
                          color: customColors.dangerColor,
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
                            ? customColors.accentSoftColor
                            : `rgba(${customColors.onSurfaceRgb}, 0.75)`,
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
                        color: `rgba(${customColors.onSurfaceRgb}, 0.75)`,
                        transition: 'opacity 0.12s, color 0.12s',
                        '&:hover': {
                          backgroundColor: `rgba(${customColors.dangerRgb}, 0.14)`,
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
              backgroundColor: customColors.raisedColor,
              backgroundImage: 'none',
              border: `1px solid ${customColors.lineColor}`,
              color: customColors.dialogTextColor,
              position: 'relative',
            },
          },
        }}
      >
        <DialogCloseButton onClose={() => setPending(null)} />

        <DialogTitle
          sx={{
            fontSize: OFFLINE_FONT.section,
            fontWeight: 600,
            pr: `${DIALOG_TITLE_RIGHT_INSET}px`,
          }}
        >
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: OFFLINE_FONT.body }}>
            {shown?.text}
          </Typography>
          {shown?.note && (
            <Typography
              sx={{
                fontSize: OFFLINE_FONT.caption,
                color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
                mt: 1.25,
              }}
            >
              {shown.note}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
              backgroundColor: customColors.dangerFillColor,
              color: customColors.onAccentColor,
              '&:hover': { backgroundColor: customColors.dangerHoverColor },
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
