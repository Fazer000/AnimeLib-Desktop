import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import { Bug } from '../icons';
import DialogCloseButton from '../DialogCloseButton';
import {
  DIALOG_TITLE_RIGHT_INSET,
  REPORT_DESCRIPTION_MAX,
  REPORT_KIND_DEFAULT,
  REPORT_KIND_LABELS,
  REPORT_KINDS,
  REPORT_TITLE_MAX,
  ReportKind,
  ReportPayload,
} from '../../../constants';

interface ReportDialogProps {
  open: boolean;
  onSubmit: (payload: ReportPayload) => void;
  onClose: () => void;
}

const fieldSx = (customColors: CustomColors) => ({
  '& .MuiOutlinedInput-root': {
    color: customColors.dialogTextColor,
    fontSize: '0.9rem',
    '& fieldset': { borderColor: customColors.borderColor },
    '&:hover fieldset': { borderColor: customColors.accentSoftColor },
    '&.Mui-focused fieldset': { borderColor: customColors.accentSoftColor },
  },
  '& .MuiInputLabel-root': {
    color: customColors.mutedTextColor,
    fontSize: '0.9rem',
  },
  '& .MuiInputLabel-root.Mui-focused': { color: customColors.accentSoftColor },
  '& .MuiFormHelperText-root': { color: customColors.mutedTextColor },
});

/**
 * Форма обращения, из которой собирается issue на GitHub
 */
function ReportDialog({ open, onSubmit, onClose }: ReportDialogProps) {
  const { customColors } = useTheme().palette;
  const [kind, setKind] = useState<ReportKind>(REPORT_KIND_DEFAULT);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setKind(REPORT_KIND_DEFAULT);
    setTitle('');
    setDescription('');
  }, [open]);

  const canSubmit = title.trim().length > 0;

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
        <Bug sx={{ fontSize: 20, color: customColors.accentSoftColor }} />
        Сообщить о проблеме
      </DialogTitle>

      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
      >
        <Typography
          sx={{ fontSize: '0.85rem', color: customColors.mutedTextColor }}
        >
          Обращение откроется на GitHub уже заполненным — останется только
          отправить. Версия приложения и данные об ОС подставятся автоматически.
        </Typography>

        <TextField
          select
          size="small"
          label="Категория"
          value={kind}
          onChange={(event) => setKind(event.target.value as ReportKind)}
          sx={fieldSx(customColors)}
          slotProps={{ select: { MenuProps: { disableScrollLock: true } } }}
        >
          {REPORT_KINDS.map((value) => (
            <MenuItem key={value} value={value} sx={{ fontSize: '0.9rem' }}>
              {REPORT_KIND_LABELS[value]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          label="Заголовок"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          slotProps={{ htmlInput: { maxLength: REPORT_TITLE_MAX } }}
          sx={fieldSx(customColors)}
        />

        <TextField
          multiline
          minRows={5}
          maxRows={12}
          size="small"
          label="Описание"
          placeholder="Что произошло, что ожидалось, как повторить"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          slotProps={{ htmlInput: { maxLength: REPORT_DESCRIPTION_MAX } }}
          sx={fieldSx(customColors)}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => onSubmit({ kind, title, description })}
          sx={{
            textTransform: 'none',
            backgroundColor: customColors.secondaryColor,
            color: customColors.onAccentColor,
            '&:hover': { backgroundColor: customColors.accentHoverColor },
          }}
        >
          Продолжить в GitHub
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportDialog;
