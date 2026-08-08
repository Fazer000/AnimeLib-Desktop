import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import {
  CloseRounded,
  DeleteRounded,
  PlayArrowRounded,
} from '@mui/icons-material';
import { DownloadTask, OfflineAnime } from '../../../constants';
import { offlineStore } from '../../services/offline';

interface DownloadsListProps {
  tasks: DownloadTask[];
  anime: OfflineAnime[];
}

interface PendingRemoval {
  text: string;
  confirm: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'В очереди',
  downloading: 'Загрузка',
  paused: 'Пауза',
  completed: 'Готово',
  error: 'Ошибка',
  cancelled: 'Отменено',
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
 * Список активных загрузок и скачанных серий
 */
function DownloadsList({ tasks, anime }: DownloadsListProps) {
  const [pending, setPending] = useState<PendingRemoval | null>(null);

  const activeFile = offlineStore.getActiveFile();

  const isActive = (status: string) =>
    status === 'queued' || status === 'downloading' || status === 'paused';

  const activeTasks = tasks.filter((task) => isActive(task.status));
  const finishedTasks = tasks.filter((task) => !isActive(task.status));

  const requestRemoval = (
    // eslint-disable-next-line @typescript-eslint/no-shadow
    isActive: boolean,
    text: string,
    action: () => void,
  ) => {
    if (isActive) {
      setPending({ text, confirm: action });
      return;
    }

    action();
  };

  return (
    <Box>
      {tasks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {`Очередь · ${activeTasks.length}`}
            </Typography>
            {finishedTasks.length > 0 && (
              <Button
                size="small"
                onClick={() => offlineStore.clearFinished()}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  color: '#ef5350',
                  '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.12)' },
                }}
              >
                Очистить завершённые
              </Button>
            )}
          </Box>

          {tasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                py: 1,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: '0.8rem' }} noWrap>
                  {`${task.animeTitle} · ${task.episodeNumber} серия · ${task.quality} · ${task.teamName}`}
                </Typography>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      color:
                        task.status === 'error'
                          ? '#ef5350'
                          : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {task.status === 'downloading'
                      ? `${task.progress}%`
                      : task.error || STATUS_LABELS[task.status]}
                  </Typography>

                  {(task.status === 'paused' || task.status === 'error') && (
                    <IconButton
                      size="small"
                      onClick={() => offlineStore.resume(task.id)}
                    >
                      <PlayArrowRounded
                        sx={{ fontSize: 18, color: '#7C3AED' }}
                      />
                    </IconButton>
                  )}

                  {task.status !== 'cancelled' &&
                    task.status !== 'completed' && (
                      <IconButton
                        size="small"
                        onClick={() => offlineStore.cancel(task.id)}
                      >
                        <CloseRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                </Box>
              </Box>

              {(task.status === 'downloading' || task.status === 'paused') && (
                <LinearProgress
                  variant="determinate"
                  value={task.progress}
                  sx={{
                    mt: 0.75,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#7C3AED' },
                  }}
                />
              )}
            </Box>
          ))}
        </Box>
      )}

      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 1 }}>
        Скачано
      </Typography>

      {anime.length === 0 && (
        <Typography
          sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}
        >
          Пока ничего не скачано
        </Typography>
      )}

      {anime.map((item) => (
        <Box key={item.animeId} sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }} noWrap>
              {item.title}
            </Typography>
            <IconButton
              size="small"
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
              <DeleteRounded sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {item.episodes.map((episode) => (
            <Box
              key={`${episode.episodeId}-${episode.playerId}-${episode.quality}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pl: 1,
                py: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.78rem',
                  color:
                    episode.fileName === activeFile
                      ? '#7C3AED'
                      : 'rgba(255,255,255,0.75)',
                }}
                noWrap
              >
                {`${episode.episodeNumber} серия · ${episode.quality} · ${episode.teamName} · ${formatSize(episode.fileSize)}`}
              </Typography>
              <IconButton
                size="small"
                onClick={() =>
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
                  )
                }
              >
                <CloseRounded sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      ))}

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
            sx={{
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.5)',
              mt: 1,
            }}
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

export default DownloadsList;
