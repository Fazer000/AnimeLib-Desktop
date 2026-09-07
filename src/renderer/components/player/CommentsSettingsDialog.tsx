import {
  Box,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Slider,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import DialogCloseButton from '../DialogCloseButton';
import {
  DIALOG_TITLE_RIGHT_INSET,
  COMMENTS_COLLAPSE_MAX_LEVEL,
  COMMENTS_COLLAPSE_MIN_LEVEL,
} from '../../../constants';
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

        <Divider
          sx={{
            borderColor: `rgba(${customColors.onSurfaceRgb}, 0.08)`,
            my: 0.5,
          }}
        />

        <Box sx={{ pt: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography
              sx={{ color: `rgba(${customColors.onSurfaceRgb}, 0.85)` }}
            >
              Сворачивать вложенные комментарии
            </Typography>
            <Typography
              sx={{
                color: `rgba(${customColors.onSurfaceRgb}, 0.95)`,
                fontWeight: 700,
              }}
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
            sx={{ color: customColors.secondaryColor }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default CommentsSettingsDialog;
