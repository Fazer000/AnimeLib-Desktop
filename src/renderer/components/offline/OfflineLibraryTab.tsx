import React, { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  DeleteRounded,
  ExpandMoreRounded,
  PlayArrowRounded,
} from '@mui/icons-material';
import { OfflineAnime, OfflineEpisode } from '../../../constants';
import {
  offlineCatalog,
  offlineStore,
  progressStore,
} from '../../services/offline';

interface OfflineLibraryTabProps {
  anime: OfflineAnime[];
  // eslint-disable-next-line react/require-default-props
  onPlay?: (animeId: string, episodeId?: number) => void;
}

interface PendingRemoval {
  text: string;
  confirm: () => void;
}

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
 * Форматирует размер файла
 */
const formatSize = (bytes: number): string => {
  if (!bytes) {
    return '';
  }
  return `${(bytes / 1024 / 1024).toFixed(0)} МБ`;
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
 * Библиотека скачанного с запуском просмотра и удалением серий
 */
function OfflineLibraryTab({ anime, onPlay }: OfflineLibraryTabProps) {
  const [expandedId, setExpandedId] = useState<string>('');
  const [pending, setPending] = useState<PendingRemoval | null>(null);

  const activeFile = offlineStore.getActiveFile();

  const requestRemoval = (
    isPlaying: boolean,
    text: string,
    action: () => void,
  ) => {
    if (isPlaying) {
      setPending({ text, confirm: action });
      return;
    }

    action();
  };

  if (anime.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
        Библиотека пока пуста. Откройте аниме в плеере и скачайте серии для
        оффлайн просмотра.
      </Typography>
    );
  }

  return (
    <Box>
      {anime.map((item) => {
        const episodes = sortEpisodes(item.episodes);
        const progress = progressStore.getLatestForAnime(item.animeId);
        const coverUrl = offlineCatalog.getCoverUrl(item);
        const isExpanded = expandedId === item.animeId;
        const toggle = () => setExpandedId(isExpanded ? '' : item.animeId);

        return (
          <Box
            key={item.animeId}
            sx={{
              mb: 1.5,
              pb: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                onClick={toggle}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flex: 1,
                  minWidth: 0,
                  p: 0.75,
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
                    width: 46,
                    height: 64,
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
                    sx={{ fontSize: '0.85rem', fontWeight: 600 }}
                    noWrap
                  >
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}
                  >
                    {progress
                      ? `${countEpisodes(item.episodes)} серий · остановились на ${progress.itemNumber} серии (${formatTime(progress.seconds)})`
                      : `${countEpisodes(item.episodes)} серий`}
                  </Typography>
                </Box>

                <ExpandMoreRounded
                  className="library-chevron"
                  sx={{
                    fontSize: 20,
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
                  startIcon={<PlayArrowRounded sx={{ fontSize: 16 }} />}
                  onClick={() => onPlay(item.animeId, progress?.episodeId)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
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
                size="small"
                sx={{
                  flexShrink: 0,
                  color: '#ef5350',
                  '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.14)' },
                }}
                onClick={() =>
                  requestRemoval(
                    Boolean(activeFile) &&
                      item.episodes.some(
                        (episode) => episode.fileName === activeFile,
                      ),
                    `Серия из «${item.title}» сейчас воспроизводится. Удалить всё скачанное аниме?`,
                    () => offlineStore.removeAnime(item.animeId),
                  )
                }
              >
                <DeleteRounded sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>

            <Collapse in={isExpanded}>
              <Box sx={{ pl: 6.5, pr: 0.5, pt: 0.5 }}>
                {episodes.map((episode) => (
                  <Box
                    key={`${episode.episodeId}-${episode.playerId}-${episode.quality}`}
                    onClick={() => onPlay?.(item.animeId, episode.episodeId)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      pl: 1,
                      pr: 0.5,
                      py: 0.25,
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
                        fontSize: '0.78rem',
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
                        requestRemoval(
                          episode.fileName === activeFile,
                          `Серия ${episode.episodeNumber} сейчас воспроизводится. Удалить файл?`,
                          () =>
                            offlineStore.removeEpisode(
                              item.animeId,
                              episode.episodeId,
                              episode.playerId,
                              episode.quality,
                            ),
                        );
                      }}
                    >
                      <CloseRounded sx={{ fontSize: 14 }} />
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
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem' }}>{pending?.text}</Typography>
          <Typography
            sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', mt: 1 }}
          >
            При наличии сети плеер продолжит с онлайн-источника.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPending(null)}
            sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.6)' }}
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
              backgroundColor: '#7C3AED',
              color: '#ffffff',
              '&:hover': { backgroundColor: '#6D28D9' },
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
