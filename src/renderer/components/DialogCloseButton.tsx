import React from 'react';
import { IconButton, useTheme } from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { DIALOG_CLOSE_INSET } from '../../constants';

interface DialogCloseButtonProps {
  onClose: () => void;
}

/**
 * Крестик закрытия в углу окна, одинаковый во всех диалогах
 */
function DialogCloseButton({ onClose }: DialogCloseButtonProps) {
  const { customColors } = useTheme().palette;

  return (
    <IconButton
      onClick={onClose}
      size="small"
      aria-label="Закрыть"
      sx={{
        position: 'absolute',
        top: DIALOG_CLOSE_INSET,
        right: DIALOG_CLOSE_INSET,
        zIndex: 1,
        color: customColors.mutedTextColor,
      }}
    >
      <CloseRounded sx={{ fontSize: 20 }} />
    </IconButton>
  );
}

export default DialogCloseButton;
