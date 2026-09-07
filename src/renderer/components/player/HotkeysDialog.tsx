import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { KeyboardRounded } from '@mui/icons-material';
import DialogCloseButton from '../DialogCloseButton';
import {
  DIALOG_TITLE_RIGHT_INSET,
  HOTKEY_GROUPS,
  HOTKEY_LAYOUT_HINT,
  HotkeyGroup,
} from '../../../constants';

interface HotkeysDialogProps {
  open: boolean;
  onClose: () => void;
}

const keySx = (customColors: CustomColors) => ({
  px: 0.75,
  py: 0.25,
  minWidth: 22,
  textAlign: 'center',
  fontSize: '0.72rem',
  fontFamily: 'monospace',
  color: customColors.dialogTextColor,
  borderRadius: 1,
  border: `1px solid ${alpha(customColors.borderColor, 0.9)}`,
  backgroundColor: alpha(customColors.dialogTextColor, 0.06),
  whiteSpace: 'nowrap',
});

/**
 * Колонка одной группы сочетаний
 */
function HotkeyColumn({ group }: { group: HotkeyGroup }) {
  const { customColors } = useTheme().palette;
  return (
    <Box>
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: customColors.accentSoftColor,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          mb: 1,
        }}
      >
        {group.title}
      </Typography>

      {group.items.map((item) => (
        <Box
          key={item.label}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            py: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.82rem',
              color: alpha(customColors.dialogTextColor, 0.85),
            }}
          >
            {item.label}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {item.keys.map((key) => (
              <Box key={key} sx={keySx(customColors)}>
                {key}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Окно со списком горячих клавиш плеера
 */
function HotkeysDialog({ open, onClose }: HotkeysDialogProps) {
  const { customColors } = useTheme().palette;
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        <KeyboardRounded
          sx={{ fontSize: 20, color: customColors.accentSoftColor }}
        />
        Горячие клавиши
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            columnGap: 3,
            rowGap: 2.5,
          }}
        >
          {HOTKEY_GROUPS.map((group) => (
            <HotkeyColumn key={group.title} group={group} />
          ))}
        </Box>

        <Typography
          sx={{
            fontSize: '0.75rem',
            color: customColors.mutedTextColor,
            mt: 2.5,
          }}
        >
          {HOTKEY_LAYOUT_HINT}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

export default HotkeysDialog;
