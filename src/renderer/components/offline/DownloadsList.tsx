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
import { alpha } from '@mui/material/styles';
import { CloseRounded, PlayArrowRounded } from '@mui/icons-material';
import {
  DownloadTask,
  OFFLINE_FONT,
  OFFLINE_ICON,
  isActiveDownload,
} from '../../../constants';
import { offlineStore } from '../../services/offline';
import useDownloadSpeed from '../../hooks/useDownloadSpeed';
import {
  formatEta,
  formatProgress,
  formatSpeed,
} from '../../utils/offlineFormat';
import {
  ACCENT,
  ACCENT_LIGHT,
  DANGER,
  DANGER_STRONG,
  SURFACE_RAISED,
  WHITE,
} from '../../theme/palette';

interface DownloadsListProps {
  tasks: DownloadTask[];
}

const CANCEL_SX = {
  textTransform: 'none',
  fontSize: OFFLINE_FONT.button,
  color: DANGER,
  '&:hover': { backgroundColor: alpha(DANGER, 0.12) },
};

const CLEAR_SX = {
  textTransform: 'none',
  fontSize: OFFLINE_FONT.button,
  color: ACCENT_LIGHT,
  '&:hover': { backgroundColor: alpha(ACCENT_LIGHT, 0.12) },
};

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
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const activeTasks = tasks.filter((task) => isActiveDownload(task.status));
  const finishedTasks = tasks.filter((task) => !isActiveDownload(task.status));

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

        {activeTasks.length > 0 && (
          <Button
            size="small"
            onClick={() => setConfirmOpen(true)}
            sx={CANCEL_SX}
          >
            Отменить все
          </Button>
        )}

        {activeTasks.length === 0 && finishedTasks.length > 0 && (
          <Button
            size="small"
            onClick={() => offlineStore.clearFinished()}
            sx={CLEAR_SX}
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

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: SURFACE_RAISED,
              backgroundImage: 'none',
              color: WHITE,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: OFFLINE_FONT.section, fontWeight: 600 }}>
          Отменить все загрузки?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: OFFLINE_FONT.body }}>
            {`Будет отменено задач: ${activeTasks.length}. Скачанные части удалятся, начатые серии придётся загружать заново.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{
              textTransform: 'none',
              fontSize: OFFLINE_FONT.button,
              color: alpha(WHITE, 0.6),
            }}
          >
            Оставить
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmOpen(false);
              offlineStore.cancelAll();
            }}
            sx={{
              textTransform: 'none',
              fontSize: OFFLINE_FONT.button,
              px: 2,
              backgroundColor: DANGER,
              color: WHITE,
              '&:hover': { backgroundColor: DANGER_STRONG },
            }}
          >
            Отменить все
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DownloadsList;
