import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { CloudOffRounded } from '@mui/icons-material';
import {
  ACCENT,
  ACCENT_DEEP,
  SURFACE_RAISED,
  WHITE,
} from '../../theme/palette';

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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}
      >
        <CloudOffRounded sx={{ fontSize: 20, color: ACCENT }} />
        Нет соединения с сайтом
      </DialogTitle>

      <DialogContent>
        <Typography sx={{ fontSize: '0.85rem' }}>
          Сайт недоступен, но скачанные серии можно смотреть без интернета.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none', color: 'rgba(255,255,255,0.6)' }}
        >
          Остаться
        </Button>
        <Button
          variant="contained"
          onClick={onOpenLibrary}
          sx={{
            textTransform: 'none',
            backgroundColor: ACCENT,
            color: WHITE,
            '&:hover': { backgroundColor: ACCENT_DEEP },
          }}
        >
          Открыть библиотеку
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OfflineNoticeDialog;
