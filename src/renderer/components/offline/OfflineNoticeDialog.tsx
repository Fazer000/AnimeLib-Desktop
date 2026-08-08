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
            backgroundColor: '#2b2b2e',
            backgroundImage: 'none',
            color: '#ffffff',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}
      >
        <CloudOffRounded sx={{ fontSize: 20, color: '#7C3AED' }} />
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
            backgroundColor: '#7C3AED',
            color: '#ffffff',
            '&:hover': { backgroundColor: '#6D28D9' },
          }}
        >
          Открыть библиотеку
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OfflineNoticeDialog;
