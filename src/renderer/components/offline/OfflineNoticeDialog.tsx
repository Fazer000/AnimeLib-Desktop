import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from '@mui/material';
import { CloudOff } from '../icons';
import DialogCloseButton from '../DialogCloseButton';
import { DIALOG_TITLE_RIGHT_INSET } from '../../../constants';

interface OfflineNoticeDialogProps {
  open: boolean;
  onOpenLibrary: () => void;
  onClose: () => void;
}

/**
 * Предлагает перейти к скачанному при потере связи
 */
function OfflineNoticeDialog({
  open,
  onOpenLibrary,
  onClose,
}: OfflineNoticeDialogProps) {
  const { customColors } = useTheme().palette;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: customColors.raisedColor,
            backgroundImage: 'none',
            border: `1px solid ${customColors.lineColor}`,
            color: customColors.dialogTextColor,
            borderRadius: 2,
            position: 'relative',
          },
        },
      }}
    >
      <DialogCloseButton onClose={onClose} />

      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: '1rem',
          pr: `${DIALOG_TITLE_RIGHT_INSET}px`,
        }}
      >
        <CloudOff sx={{ fontSize: 20, color: customColors.accentSoftColor }} />
        Нет соединения с сайтом
      </DialogTitle>

      <DialogContent>
        <Typography sx={{ fontSize: '0.85rem' }}>
          Сайт недоступен, но скачанные серии можно смотреть без интернета.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          onClick={onOpenLibrary}
          sx={{
            textTransform: 'none',
            backgroundColor: customColors.secondaryColor,
            color: customColors.onAccentColor,
            '&:hover': { backgroundColor: customColors.accentHoverColor },
          }}
        >
          Открыть библиотеку
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OfflineNoticeDialog;
