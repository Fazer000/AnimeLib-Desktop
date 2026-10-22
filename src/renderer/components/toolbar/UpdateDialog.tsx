import React from 'react';
import type { CustomColors } from '@mui/material/styles';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
  useTheme,
} from '@mui/material';
import { ExternalLink } from '../icons';
import DialogCloseButton from '../DialogCloseButton';
import ManualCommand from './ManualCommand';
import {
  DIALOG_TITLE_RIGHT_INSET,
  UpdateFailure,
  UpdateInfo,
} from '../../../constants';
import { isUpdateBusy, UpdateStatus } from '../../hooks/useUpdateChecker';
import {
  getUpdateCaption,
  getUpdateConfirmLabel,
  getUpdateFailureText,
} from '../../utils/updateStatus';
import { SUCCESS_DEEP, SUCCESS_MID, SUCCESS_STRONG } from '../../theme/palette';

interface UpdateDialogProps {
  open: boolean;
  updateInfo: UpdateInfo;
  status: UpdateStatus;
  failure: UpdateFailure | null;
  manualCommand: string | null;
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
const renderNotes = (
  notes: string,
  customColors: CustomColors,
): React.ReactNode => {
  const lines = notes.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return (
      <Typography
        sx={{
          fontSize: '0.85rem',
          color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
        }}
      >
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
            color: customColors.dialogTextColor,
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
            color: `rgba(${customColors.onSurfaceRgb}, 0.8)`,
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
        sx={{
          fontSize: '0.85rem',
          color: `rgba(${customColors.onSurfaceRgb}, 0.8)`,
          mb: 0.5,
        }}
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
  failure,
  manualCommand,
  progress,
  onConfirm,
  onOpenRelease,
  onClose,
}: UpdateDialogProps) {
  const { customColors } = useTheme().palette;
  const isDownloading = isUpdateBusy(status);
  const caption = getUpdateCaption(status, progress);
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
            backgroundColor: customColors.dialogColor,
            backgroundImage: 'none',
            border: `1px solid ${customColors.lineColor}`,
            color: customColors.dialogTextColor,
            borderRadius: 2,
            position: 'relative',
          },
        },
      }}
    >
      {!isDownloading && <DialogCloseButton onClose={onClose} />}

      <DialogTitle sx={{ pb: 0.5, pr: `${DIALOG_TITLE_RIGHT_INSET}px` }}>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {updateInfo.releaseName || `Версия ${updateInfo.latestVersion}`}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: `rgba(${customColors.onSurfaceRgb}, 0.55)`,
            mt: 0.5,
          }}
        >
          {`Текущая версия ${updateInfo.currentVersion} → ${updateInfo.latestVersion}`}
          {publishedAt ? ` · ${publishedAt}` : ''}
        </Typography>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ borderColor: `rgba(${customColors.onSurfaceRgb}, 0.1)` }}
      >
        <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
          {renderNotes(updateInfo.releaseNotes, customColors)}
        </Box>

        {caption && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={status === 'downloading' ? progress : 100}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.12)`,
                '& .MuiLinearProgress-bar': { backgroundColor: SUCCESS_MID },
              }}
            />
            <Typography
              sx={{
                fontSize: '0.8rem',
                color: `rgba(${customColors.onSurfaceRgb}, 0.6)`,
                mt: 0.75,
              }}
            >
              {caption.text}
            </Typography>
            {caption.hint && (
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: `rgba(${customColors.onSurfaceRgb}, 0.45)`,
                  mt: 0.25,
                }}
              >
                {caption.hint}
              </Typography>
            )}
          </Box>
        )}

        {status === 'error' && (
          <Typography
            sx={{ fontSize: '0.8rem', color: customColors.dangerColor, mt: 2 }}
          >
            {getUpdateFailureText(failure)}
          </Typography>
        )}

        {status === 'error' && manualCommand && (
          <ManualCommand command={manualCommand} />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onOpenRelease}
          startIcon={<ExternalLink sx={{ fontSize: 16 }} />}
          sx={{
            mr: 'auto',
            textTransform: 'none',
            fontSize: '0.85rem',
            color: customColors.accentSoftColor,
            '&:hover': {
              backgroundColor: `rgba(${customColors.accentRgb}, 0.12)`,
            },
          }}
        >
          Страница релиза
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
          {getUpdateConfirmLabel(failure)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UpdateDialog;
