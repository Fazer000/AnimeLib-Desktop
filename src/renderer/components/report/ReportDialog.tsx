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
} from '@mui/material';
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
import {
  ACCENT,
  ACCENT_DEEP,
  BORDER,
  SURFACE_RAISED,
  TEXT_MUTED,
  WHITE,
} from '../../theme/palette';

interface ReportDialogProps {
  open: boolean;
  onSubmit: (payload: ReportPayload) => void;
  onClose: () => void;
}

const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    color: WHITE,
    fontSize: '0.9rem',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root': { color: TEXT_MUTED, fontSize: '0.9rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
  '& .MuiFormHelperText-root': { color: TEXT_MUTED },
};

/**
 * Форма обращения, из которой собирается issue на GitHub
 */
function ReportDialog({ open, onSubmit, onClose }: ReportDialogProps) {
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
            backgroundColor: SURFACE_RAISED,
            backgroundImage: 'none',
            color: WHITE,
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
        <Typography sx={{ fontSize: '0.85rem', color: TEXT_MUTED }}>
          Обращение откроется на GitHub уже заполненным — останется только
          отправить. Версия приложения и данные об ОС подставятся автоматически.
        </Typography>

        <TextField
          select
          size="small"
          label="Категория"
          value={kind}
          onChange={(event) => setKind(event.target.value as ReportKind)}
          sx={FIELD_SX}
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
          sx={FIELD_SX}
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
          sx={FIELD_SX}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none', color: TEXT_MUTED }}
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
            color: WHITE,
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
