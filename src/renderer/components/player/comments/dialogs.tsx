import { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import {
  DANGER_DEEP,
  DANGER_SOFT,
  SURFACE_DIALOG,
} from '../../../theme/palette';

const paperSx = (minWidth: number) => ({
  backgroundColor: SURFACE_DIALOG,
  backgroundImage: 'none',
  borderRadius: 2,
  minWidth,
});

const TITLE_SX = {
  color: 'rgba(255, 255, 255, 0.95)',
  fontSize: '1.0625rem',
  fontWeight: 600,
  pb: 1,
};

const ACTIONS_SX = { px: 3, pb: 2, gap: 1 };

const IGNORE_BENEFITS = [
  'Скрывает комментарии этого пользователя',
  'Запрещает этому пользователю отвечать на ваши комментарии',
  'Запрещает этому пользователю писать вам личные сообщения',
  'Запрещает этому пользователю писать в вашей теме или отвечать на ваши посты форума',
];

interface IgnoreUserDialogProps {
  open: boolean;
  note: string;
  isSubmitting: boolean;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

/** Диалог добавления автора комментария в игнор-лист. */
export function IgnoreUserDialog({
  open,
  note,
  isSubmitting,
  onNoteChange,
  onClose,
  onConfirm,
}: IgnoreUserDialogProps) {
  const [hintOpen, setHintOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: paperSx(420) } }}
    >
      <DialogTitle sx={TITLE_SX}>Добавление в игнор-лист</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.8125rem',
            mb: 1,
          }}
        >
          Комментарий (необязательно)
        </Typography>
        <TextField
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Позволит вам помнить причину по которой вы добавили пользователя в игнор-лист"
          multiline
          minRows={3}
          fullWidth
          slotProps={{ input: { sx: { color: 'rgba(255, 255, 255, 0.9)' } } }}
        />

        <Box
          onClick={() => setHintOpen((isOpen) => !isOpen)}
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1.5,
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}
          >
            Что позволяет игнор-лист?
          </Typography>
          <ExpandMore
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              transform: hintOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </Box>
        <Collapse in={hintOpen}>
          <Box
            component="ul"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              pl: 3,
              mt: 1,
            }}
          >
            {IGNORE_BENEFITS.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </Box>
        </Collapse>
      </DialogContent>
      <DialogActions sx={ACTIONS_SX}>
        <Button
          onClick={onClose}
          disabled={isSubmitting}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
        >
          Отмена
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          variant="contained"
          sx={{ backgroundColor: DANGER_DEEP, fontWeight: 600 }}
        >
          {isSubmitting ? 'Добавление...' : 'Добавить в игнор'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface DeleteCommentDialogProps {
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Подтверждение удаления комментария. */
export function DeleteCommentDialog({
  open,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteCommentDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: paperSx(360) } }}
    >
      <DialogTitle sx={TITLE_SX}>Подтвердите действие</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <DialogContentText
          sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9375rem' }}
        >
          Вы действительно хотите удалить комментарий?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={ACTIONS_SX}>
        <Button
          onClick={onClose}
          disabled={isDeleting}
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
          }}
        >
          Отменить
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isDeleting}
          sx={{
            color: DANGER_SOFT,
            fontWeight: 600,
            '&:hover': { backgroundColor: 'rgba(248, 113, 113, 0.12)' },
          }}
        >
          {isDeleting ? 'Удаление...' : 'Удалить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
