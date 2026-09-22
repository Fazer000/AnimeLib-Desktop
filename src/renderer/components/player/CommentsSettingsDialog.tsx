import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import DialogCloseButton from '../DialogCloseButton';
import { DIALOG_TITLE_RIGHT_INSET } from '../../../constants';
import { CommentsSettings } from '../../hooks/useCommentsSettings';

const checkboxSx = (colors: CustomColors) => ({
  color: `rgba(${colors.onSurfaceRgb}, 0.4)`,
  '&.Mui-checked': { color: colors.accentSoftColor },
  '&:hover': { backgroundColor: `rgba(${colors.accentRgb}, 0.08)` },
});

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
  const { customColors } = useTheme().palette;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: customColors.dialogColor,
            backgroundImage: 'none',
            border: `1px solid ${customColors.lineColor}`,
            borderRadius: 2,
            position: 'relative',
            minWidth: 460,
          },
        },
      }}
    >
      <DialogCloseButton onClose={onClose} />

      <DialogTitle
        sx={{
          color: `rgba(${customColors.onSurfaceRgb}, 0.95)`,
          fontSize: '1.0625rem',
          fontWeight: 600,
          pr: `${DIALOG_TITLE_RIGHT_INSET}px`,
        }}
      >
        Настройки комментариев
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.disabled}
              onChange={(event) => onChange({ disabled: event.target.checked })}
              sx={checkboxSx(customColors)}
            />
          }
          label={
            <Typography
              sx={{ color: `rgba(${customColors.onSurfaceRgb}, 0.85)` }}
            >
              Отключить комментарии <strong>в плеере</strong>
            </Typography>
          }
        />

        <Divider
          sx={{
            borderColor: `rgba(${customColors.onSurfaceRgb}, 0.08)`,
            my: 0.5,
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={settings.highlightNew}
              onChange={(event) =>
                onChange({ highlightNew: event.target.checked })
              }
              sx={checkboxSx(customColors)}
            />
          }
          label={
            <Typography
              sx={{ color: `rgba(${customColors.onSurfaceRgb}, 0.85)` }}
            >
              Выделять новые комментарии
            </Typography>
          }
        />
      </DialogContent>
    </Dialog>
  );
}

export default CommentsSettingsDialog;
