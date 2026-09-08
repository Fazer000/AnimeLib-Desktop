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
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { CustomColors } from '@mui/material/styles';
import { CheckCheck, CloudDownload, Play, X } from '../icons';
import {
  DIALOG_TITLE_RIGHT_INSET,
  DownloadTask,
  OFFLINE_FONT,
  OFFLINE_ICON,
  isActiveDownload,
} from '../../../constants';
import { offlineStore } from '../../services/offline';
import DialogCloseButton from '../DialogCloseButton';
import EmptyState from '../EmptyState';
import useDownloadSpeed from '../../hooks/useDownloadSpeed';
import {
  formatEta,
  formatProgress,
  formatSize,
  formatSpeed,
} from '../../utils/offlineFormat';

interface DownloadsListProps {
  tasks: DownloadTask[];
}

const cancelSx = (colors: CustomColors) => ({
  textTransform: 'none',
  fontSize: OFFLINE_FONT.button,
  color: colors.dangerColor,
  '&:hover': { backgroundColor: alpha(colors.dangerColor, 0.12) },
});

const clearSx = (colors: CustomColors) => ({
  textTransform: 'none',
  fontSize: OFFLINE_FONT.button,
  color: colors.accentSoftColor,
  '&:hover': { backgroundColor: alpha(colors.accentSoftColor, 0.12) },
});

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
  const { customColors } = useTheme().palette;
  const speeds = useDownloadSpeed(tasks);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);

  const activeTasks = tasks.filter((task) => isActiveDownload(task.status));
  const finishedTasks = tasks.filter((task) => !isActiveDownload(task.status));

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<CloudDownload />}
        text="Очередь пуста. Загруженные серии доступны на вкладке «Библиотека»."
      />
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
            sx={cancelSx(customColors)}
          >
            Отменить все
          </Button>
        )}

        {activeTasks.length === 0 && finishedTasks.length > 0 && (
          <Button
            size="small"
            onClick={() => offlineStore.clearFinished()}
            sx={clearSx(customColors)}
          >
            Очистить список
          </Button>
        )}
      </Box>

      {tasks.map((task, index) => {
        const isRunning =
          task.status === 'queued' ||
          task.status === 'downloading' ||
          task.status === 'paused';
        const isDone = task.status === 'completed';

        return (
          <Box
            key={task.id}
            sx={{
              px: isRunning ? 1.5 : 0.5,
              py: isRunning ? 1.25 : 1,
              mb: isRunning ? 0.875 : 0,
              borderRadius: isRunning ? 1 : 0,
              opacity: isDone ? 0.7 : 1,
              backgroundColor: isRunning
                ? customColors.raisedColor
                : 'transparent',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.25,
              }}
            >
              <Typography
                sx={{
                  fontSize: OFFLINE_FONT.hint,
                  color: customColors.mutedTextColor,
                  minWidth: 20,
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {index + 1}
              </Typography>

              {isDone && (
                <CheckCheck
                  sx={{
                    fontSize: OFFLINE_ICON.md,
                    color: customColors.successColor,
                    flexShrink: 0,
                  }}
                />
              )}

              <Typography
                sx={{
                  fontSize: OFFLINE_FONT.body,
                  flex: 1,
                  minWidth: 0,
                  color: isDone ? customColors.accentTextColor : 'inherit',
                }}
                noWrap
              >
                {`${task.animeTitle} · ${task.episodeNumber} серия · ${task.quality} · ${task.teamName}`}
              </Typography>

              <Box
                sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
              >
                <Typography
                  sx={{
                    fontSize: OFFLINE_FONT.hint,
                    color:
                      task.status === 'error'
                        ? customColors.dangerColor
                        : customColors.mutedTextColor,
                  }}
                >
                  {isDone && formatSize(task.totalBytes)}
                  {!isDone &&
                    (task.status === 'downloading'
                      ? `${task.progress}%`
                      : task.error || STATUS_LABELS[task.status])}
                </Typography>

                {(task.status === 'paused' || task.status === 'error') && (
                  <IconButton
                    size="small"
                    onClick={() => offlineStore.resume(task.id)}
                  >
                    <Play
                      sx={{
                        fontSize: OFFLINE_ICON.lg,
                        color: customColors.accentSoftColor,
                      }}
                    />
                  </IconButton>
                )}

                {task.status !== 'cancelled' && !isDone && (
                  <IconButton
                    size="small"
                    onClick={() => offlineStore.cancel(task.id)}
                  >
                    <X sx={{ fontSize: OFFLINE_ICON.md }} />
                  </IconButton>
                )}
              </Box>
            </Box>

            {isRunning && (
              <LinearProgress
                variant="determinate"
                value={task.status === 'queued' ? 0 : task.progress}
                sx={{
                  mt: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: customColors.borderColor,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: customColors.accentSoftColor,
                  },
                }}
              />
            )}

            {task.status === 'downloading' && (
              <Typography
                sx={{
                  fontSize: OFFLINE_FONT.hint,
                  color: customColors.mutedTextColor,
                  mt: 0.75,
                }}
              >
                {buildDetails(task, speeds[task.id] || 0)}
              </Typography>
            )}
          </Box>
        );
      })}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
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
        <DialogCloseButton onClose={() => setConfirmOpen(false)} />

        <DialogTitle
          sx={{
            fontSize: OFFLINE_FONT.section,
            fontWeight: 600,
            pr: `${DIALOG_TITLE_RIGHT_INSET}px`,
          }}
        >
          Отменить все загрузки?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: OFFLINE_FONT.body }}>
            {`Будет отменено задач: ${activeTasks.length}. Скачанные части удалятся, начатые серии придётся загружать заново.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
              backgroundColor: customColors.dangerFillColor,
              color: customColors.onAccentColor,
              '&:hover': { backgroundColor: customColors.dangerHoverColor },
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
