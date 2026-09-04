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
import { BugReportRounded } from '@mui/icons-material';
import {
  REPORT_DESCRIPTION_MAX,
  REPORT_KIND_DEFAULT,
  REPORT_KIND_LABELS,
  REPORT_KINDS,
  REPORT_TITLE_MAX,
  ReportKind,
  ReportPayload,
} from '../../../constants';
import { ACCENT, ACCENT_DEEP } from '../../theme/palette';

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
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root': {
    color: customColors.mutedTextColor,
    fontSize: '0.9rem',
  },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
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
        <BugReportRounded sx={{ fontSize: 20, color: ACCENT }} />
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
          onClick={onClose}
          sx={{ textTransform: 'none', color: customColors.mutedTextColor }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => onSubmit({ kind, title, description })}
          sx={{
            textTransform: 'none',
            backgroundColor: ACCENT,
            color: customColors.onAccentColor,
            '&:hover': { backgroundColor: ACCENT_DEEP },
          }}
        >
          Продолжить в GitHub
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ReportDialog;
