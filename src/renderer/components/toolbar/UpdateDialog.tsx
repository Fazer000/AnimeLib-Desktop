import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { OpenInNewRounded } from '@mui/icons-material';
import { UpdateInfo } from '../../../constants';
import { UpdateStatus } from '../../hooks/useUpdateChecker';
import {
  ACCENT_LIGHT,
  DANGER,
  SUCCESS_DEEP,
  SUCCESS_MID,
  SUCCESS_STRONG,
  SURFACE_RAISED,
  WHITE,
} from '../../theme/palette';

interface UpdateDialogProps {
  open: boolean;
  updateInfo: UpdateInfo;
  status: UpdateStatus;
  progress: number;
  onConfirm: () => void;
  onOpenRelease: () => void;
  onClose: () => void;
}

/**
 * Форматирует дату публикации релиза
 */
const formatDate = (value: string): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
};

/**
 * Отображает описание релиза с базовой разметкой Markdown
 */
const renderNotes = (notes: string): React.ReactNode => {
  const lines = notes.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
        Описание изменений не указано
      </Typography>
    );
  }

  return lines.map((line, index) => {
    const text = line.trim();
    const key = `${index}-${text.slice(0, 20)}`;

    if (text.startsWith('#')) {
      return (
        <Typography
          key={key}
          sx={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: WHITE,
            mt: index === 0 ? 0 : 1.5,
            mb: 0.5,
          }}
        >
          {text.replace(/^#+\s*/, '')}
        </Typography>
      );
    }

    if (/^[-*]\s/.test(text)) {
      return (
        <Typography
          key={key}
          sx={{
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.8)',
            pl: 1.5,
            mb: 0.25,
          }}
        >
          •&nbsp;{text.replace(/^[-*]\s*/, '')}
        </Typography>
      );
    }

    return (
      <Typography
        key={key}
        sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', mb: 0.5 }}
      >
        {text}
      </Typography>
    );
  });
};

/**
 * Диалог подтверждения обновления с описанием изменений
 */
function UpdateDialog({
  open,
  updateInfo,
  status,
  progress,
  onConfirm,
  onOpenRelease,
  onClose,
}: UpdateDialogProps) {
  const isDownloading = status === 'downloading';
  const publishedAt = formatDate(updateInfo.publishedAt);

  return (
    <Dialog
      open={open}
      onClose={isDownloading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: SURFACE_RAISED,
            backgroundImage: 'none',
            color: WHITE,
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {updateInfo.releaseName || `Версия ${updateInfo.latestVersion}`}
        </Typography>
        <Typography
          sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', mt: 0.5 }}
        >
          {`Текущая версия ${updateInfo.currentVersion} → ${updateInfo.latestVersion}`}
          {publishedAt ? ` · ${publishedAt}` : ''}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
          {renderNotes(updateInfo.releaseNotes)}
        </Box>

        {isDownloading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.12)',
                '& .MuiLinearProgress-bar': { backgroundColor: SUCCESS_MID },
              }}
            />
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.6)',
                mt: 0.75,
              }}
            >
              {`Загрузка обновления… ${progress}%`}
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Typography sx={{ fontSize: '0.8rem', color: DANGER, mt: 2 }}>
            Не удалось загрузить обновление. Страница релиза открыта в браузере.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onOpenRelease}
          startIcon={<OpenInNewRounded sx={{ fontSize: 16 }} />}
          sx={{
            mr: 'auto',
            textTransform: 'none',
            fontSize: '0.85rem',
            color: ACCENT_LIGHT,
            '&:hover': { backgroundColor: alpha(ACCENT_LIGHT, 0.12) },
          }}
        >
          Страница релиза
        </Button>

        <Button
          onClick={onClose}
          disabled={isDownloading}
          sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none' }}
        >
          Позже
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isDownloading}
          variant="contained"
          sx={{
            textTransform: 'none',
            backgroundColor: SUCCESS_DEEP,
            '&:hover': { backgroundColor: SUCCESS_STRONG },
          }}
        >
          Обновить сейчас
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UpdateDialog;
