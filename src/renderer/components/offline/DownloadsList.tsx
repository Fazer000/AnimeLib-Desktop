import React from 'react';
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { CloseRounded, PlayArrowRounded } from '@mui/icons-material';
import { DownloadTask, OFFLINE_FONT, OFFLINE_ICON } from '../../../constants';
import { offlineStore } from '../../services/offline';
import useDownloadSpeed from '../../hooks/useDownloadSpeed';
import {
  formatEta,
  formatProgress,
  formatSpeed,
} from '../../utils/offlineFormat';
import { ACCENT, DANGER } from '../../theme/palette';

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
 * Собирает строку с объёмом, скоростью и остатком времени
 */
const buildDetails = (task: DownloadTask, speed: number): string => {
  const remaining = task.totalBytes - task.loadedBytes;
  const eta = speed > 0 && remaining > 0 ? formatEta(remaining / speed) : '';

  return [
    formatProgress(task.loadedBytes, task.totalBytes),
    formatSpeed(speed),
    eta ? `осталось ${eta}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

/**
 * Список активных и завершённых загрузок
 */
function DownloadsList({ tasks }: DownloadsListProps) {
  const speeds = useDownloadSpeed(tasks);

  const isActive = (status: string) =>
    status === 'queued' || status === 'downloading' || status === 'paused';

  const activeTasks = tasks.filter((task) => isActive(task.status));
  const finishedTasks = tasks.filter((task) => !isActive(task.status));

  if (tasks.length === 0) {
    return (
      <Typography
        sx={{ fontSize: OFFLINE_FONT.body, color: 'rgba(255,255,255,0.5)' }}
      >
        Очередь пуста. Загруженные серии доступны на вкладке «Библиотека».
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
          mb: 1.25,
        }}
      >
        <Typography sx={{ fontSize: OFFLINE_FONT.section, fontWeight: 600 }}>
          {`Очередь · ${activeTasks.length}`}
        </Typography>
        {finishedTasks.length > 0 && (
          <Button
            size="small"
            onClick={() => offlineStore.clearFinished()}
            sx={{
              textTransform: 'none',
              fontSize: OFFLINE_FONT.button,
              color: DANGER,
              '&:hover': { backgroundColor: 'rgba(239, 83, 80, 0.12)' },
            }}
          >
            Очистить список
          </Button>
        )}
      </Box>

      {tasks.map((task) => (
        <Box
          key={task.id}
          sx={{ py: 1.25, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
            }}
          >
            <Typography sx={{ fontSize: OFFLINE_FONT.body }} noWrap>
              {`${task.animeTitle} · ${task.episodeNumber} серия · ${task.quality} · ${task.teamName}`}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Typography
                sx={{
                  fontSize: OFFLINE_FONT.hint,
                  color:
                    task.status === 'error' ? DANGER : 'rgba(255,255,255,0.55)',
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
                    sx={{ fontSize: OFFLINE_ICON.lg, color: ACCENT }}
                  />
                </IconButton>
              )}

              {task.status !== 'cancelled' && task.status !== 'completed' && (
                <IconButton
                  size="small"
                  onClick={() => offlineStore.cancel(task.id)}
                >
                  <CloseRounded sx={{ fontSize: OFFLINE_ICON.md }} />
                </IconButton>
              )}
            </Box>
          </Box>

          {(task.status === 'downloading' || task.status === 'paused') && (
            <LinearProgress
              variant="determinate"
              value={task.progress}
              sx={{
                mt: 1,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: 'rgba(255,255,255,0.12)',
                '& .MuiLinearProgress-bar': { backgroundColor: ACCENT },
              }}
            />
          )}

          {task.status === 'downloading' && (
            <Typography
              sx={{
                fontSize: OFFLINE_FONT.hint,
                color: 'rgba(255,255,255,0.45)',
                mt: 0.5,
              }}
            >
              {buildDetails(task, speeds[task.id] || 0)}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default DownloadsList;
