import React from 'react';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { CloseRounded, PlayArrowRounded } from '@mui/icons-material';
import { DownloadTask } from '../../../constants';
import { offlineStore } from '../../services/offline';

interface DownloadsListProps {
  tasks: DownloadTask[];
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
 * Список активных и завершённых загрузок
 */
function DownloadsList({ tasks }: DownloadsListProps) {
  const isActive = (status: string) =>
    status === 'queued' || status === 'downloading' || status === 'paused';

  const activeTasks = tasks.filter((task) => isActive(task.status));
  const finishedTasks = tasks.filter((task) => !isActive(task.status));

  if (tasks.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
        Очередь загрузок пуста. Скачанные серии доступны во вкладке
        «Библиотека».
      </Typography>
    );
  }

  return (
    <Box>
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
          sx={{ py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
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

            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
                  <PlayArrowRounded sx={{ fontSize: 18, color: '#7C3AED' }} />
                </IconButton>
              )}

              {task.status !== 'cancelled' && task.status !== 'completed' && (
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
  );
}

export default DownloadsList;
