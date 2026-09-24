import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogTitle,
  Typography,
  useTheme,
} from '@mui/material';
import DialogCloseButton from '../DialogCloseButton';
import { Star } from '../icons';
import { DIALOG_TITLE_RIGHT_INSET, RATING_MAX_SCORE } from '../../../constants';
import { animeApi, AnimeRating } from '../../api/animeApi';
import {
  getRatingAction,
  getRatingActionLabel,
  getRatingTone,
  getSubmittedScore,
  toggleRatingScore,
} from '../../utils/animeRating';
import { createLogger } from '../../../shared/logger';

const log = createLogger('AnimeRatingDialog');

const STARS = Array.from({ length: RATING_MAX_SCORE }, (_, index) => index + 1);

interface AnimeRatingDialogProps {
  open: boolean;
  animeId: number;
  userVote: number;
  onRated: (rating: AnimeRating) => void;
  onClose: () => void;
}

/**
 * Окно оценки тайтла по десяти звёздам: поставить, изменить или удалить
 */
function AnimeRatingDialog({
  open,
  animeId,
  userVote,
  onRated,
  onClose,
}: AnimeRatingDialogProps) {
  const { customColors } = useTheme().palette;
  const [score, setScore] = useState<number>(userVote);
  const [hovered, setHovered] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setScore(userVote);
    setHovered(0);
  }, [open, userVote]);

  const action = getRatingAction(userVote, score);
  const tone = getRatingTone(score);
  const shown = hovered || score;

  const toneColors = {
    positive: {
      background: `rgba(${customColors.successRgb}, 0.16)`,
      color: customColors.successColor,
    },
    negative: {
      background: `rgba(${customColors.dangerRgb}, 0.16)`,
      color: customColors.dangerColor,
    },
    neutral: {
      background: `rgba(${customColors.onSurfaceRgb}, 0.06)`,
      color: `rgba(${customColors.onSurfaceRgb}, 0.6)`,
    },
  }[tone];

  const submit = async () => {
    setSaving(true);
    try {
      onRated(
        await animeApi.rateAnime(animeId, getSubmittedScore(userVote, score)),
      );
      onClose();
    } catch (error) {
      log.error('Failed to rate anime:', error);
    } finally {
      setSaving(false);
    }
  };

  const actionColor =
    action === 'delete'
      ? customColors.dangerColor
      : customColors.secondaryColor;

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
            width: 440,
            overflow: 'hidden',
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
        Оценка тайтла
      </DialogTitle>

      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: toneColors.background,
          color: toneColors.color,
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        {score ? (
          <Box
            sx={{
              width: 46,
              height: 46,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid currentColor',
              borderRadius: '50%',
              fontSize: '1.5rem',
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {score}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.8125rem' }}>
            Поставьте оценку
          </Typography>
        )}
      </Box>

      <Box
        onMouseLeave={() => setHovered(0)}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2.5,
        }}
      >
        {STARS.map((star) => (
          <ButtonBase
            key={star}
            aria-label={`Оценка ${star}`}
            onMouseEnter={() => setHovered(star)}
            onClick={() =>
              setScore((current) => toggleRatingScore(current, star))
            }
            sx={{
              p: 0.5,
              borderRadius: '50%',
              color:
                star <= shown
                  ? customColors.warningColor
                  : `rgba(${customColors.onSurfaceRgb}, 0.25)`,
              transition: 'color 0.12s ease, transform 0.12s ease',
              '&:hover': { transform: 'scale(1.15)' },
            }}
          >
            <Star sx={{ fontSize: 26, fill: 'currentColor' }} />
          </ButtonBase>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.25, px: 1.5, pb: 1.5 }}>
        <Button
          fullWidth
          onClick={onClose}
          sx={{
            height: 40,
            borderRadius: '6px',
            textTransform: 'none',
            fontWeight: 600,
            color: customColors.primaryTextColor,
            backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.06)`,
            '&:hover': {
              backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.12)`,
            },
          }}
        >
          Отмена
        </Button>
        <Button
          fullWidth
          disabled={saving || (action === 'store' && !score)}
          onClick={submit}
          sx={{
            height: 40,
            borderRadius: '6px',
            textTransform: 'none',
            fontWeight: 600,
            color: customColors.onAccentColor,
            backgroundColor: actionColor,
            '&:hover': {
              backgroundColor: actionColor,
              filter: 'brightness(1.1)',
            },
            '&.Mui-disabled': {
              color: customColors.onAccentColor,
              backgroundColor: actionColor,
              opacity: 0.5,
            },
          }}
        >
          {saving ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            getRatingActionLabel(action)
          )}
        </Button>
      </Box>
    </Dialog>
  );
}

export default AnimeRatingDialog;
