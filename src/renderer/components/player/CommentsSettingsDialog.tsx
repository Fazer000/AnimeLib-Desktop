import {
  Box,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Slider,
  Typography,
} from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { CommentsSettings } from '../../hooks/useCommentsSettings';
import {
  COMMENTS_COLLAPSE_MAX_LEVEL,
  COMMENTS_COLLAPSE_MIN_LEVEL,
} from '../../../constants';
import { ACCENT, ACCENT_SOFT, SURFACE_DIALOG } from '../../theme/palette';

const CHECKBOX_SX = {
  color: 'rgba(255, 255, 255, 0.4)',
  '&.Mui-checked': { color: ACCENT_SOFT },
  '&:hover': { backgroundColor: 'rgba(167, 139, 250, 0.08)' },
};

interface CommentsSettingsDialogProps {
  open: boolean;
  settings: CommentsSettings;
  onChange: (patch: Partial<CommentsSettings>) => void;
  onClose: () => void;
}

/**
 * Диалог настроек комментариев
 */
function CommentsSettingsDialog({
  open,
  settings,
  onChange,
  onClose,
}: CommentsSettingsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: SURFACE_DIALOG,
            backgroundImage: 'none',
            borderRadius: 2,
            minWidth: 460,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'rgba(255, 255, 255, 0.95)',
          fontSize: '1.0625rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        Настройки комментариев
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
        >
          <CloseRounded sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.disabled}
              onChange={(event) => onChange({ disabled: event.target.checked })}
              sx={CHECKBOX_SX}
            />
          }
          label={
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              Отключить комментарии <strong>в плеере</strong>
            </Typography>
          }
        />

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 0.5 }} />

        <FormControlLabel
          control={
            <Checkbox
              checked={settings.highlightNew}
              onChange={(event) =>
                onChange({ highlightNew: event.target.checked })
              }
              sx={CHECKBOX_SX}
            />
          }
          label={
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              Выделять новые комментарии
            </Typography>
          }
        />

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 0.5 }} />

        <Box sx={{ pt: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              Сворачивать вложенные комментарии
            </Typography>
            <Typography
              sx={{ color: 'rgba(255, 255, 255, 0.95)', fontWeight: 700 }}
            >
              {settings.collapseFromLevel >= COMMENTS_COLLAPSE_MAX_LEVEL
                ? 'никогда'
                : `с ${settings.collapseFromLevel} ур.`}
            </Typography>
          </Box>
          <Slider
            value={settings.collapseFromLevel}
            min={COMMENTS_COLLAPSE_MIN_LEVEL}
            max={COMMENTS_COLLAPSE_MAX_LEVEL}
            step={1}
            onChange={(_, value) =>
              onChange({ collapseFromLevel: value as number })
            }
            sx={{ color: ACCENT }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default CommentsSettingsDialog;
