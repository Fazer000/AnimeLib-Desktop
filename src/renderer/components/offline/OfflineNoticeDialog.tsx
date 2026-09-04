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
            color: customColors.dialogTextColor,
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem' }}
      >
        <CloudOffRounded
          sx={{ fontSize: 20, color: customColors.accentSoftColor }}
        />
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
          sx={{
            textTransform: 'none',
            color: `rgba(${customColors.onSurfaceRgb}, 0.6)`,
          }}
        >
          Остаться
        </Button>
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
