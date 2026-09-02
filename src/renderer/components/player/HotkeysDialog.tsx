import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CloseRounded, KeyboardRounded } from '@mui/icons-material';
import {
  HOTKEY_GROUPS,
  HOTKEY_LAYOUT_HINT,
  HotkeyGroup,
} from '../../../constants';
import {
  ACCENT,
  BORDER,
  SURFACE_RAISED,
  TEXT_MUTED,
  WHITE,
} from '../../theme/palette';

interface HotkeysDialogProps {
  open: boolean;
  onClose: () => void;
}

const KEY_SX = {
  px: 0.75,
  py: 0.25,
  minWidth: 22,
  textAlign: 'center',
  fontSize: '0.72rem',
  fontFamily: 'monospace',
  color: WHITE,
  borderRadius: 1,
  border: `1px solid ${alpha(BORDER, 0.9)}`,
  backgroundColor: alpha(WHITE, 0.06),
  whiteSpace: 'nowrap',
};

/**
 * Колонка одной группы сочетаний
 */
function HotkeyColumn({ group }: { group: HotkeyGroup }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: ACCENT,
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
          <Typography sx={{ fontSize: '0.82rem', color: alpha(WHITE, 0.85) }}>
            {item.label}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {item.keys.map((key) => (
              <Box key={key} sx={KEY_SX}>
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: '1rem',
          pr: 1,
        }}
      >
        <KeyboardRounded sx={{ fontSize: 20, color: ACCENT }} />
        Горячие клавиши
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Закрыть"
          sx={{ ml: 'auto', color: TEXT_MUTED }}
        >
          <CloseRounded sx={{ fontSize: 20 }} />
        </IconButton>
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

        <Typography sx={{ fontSize: '0.75rem', color: TEXT_MUTED, mt: 2.5 }}>
          {HOTKEY_LAYOUT_HINT}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

export default HotkeysDialog;
