import React, { useState } from 'react';
import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import { Star } from '../icons';
import { animeApi, AnimeRating } from '../../api/animeApi';
import { RATING_USER_BADGE, WHITE } from '../../theme/palette';
import AnimeRatingDialog from './AnimeRatingDialog';

interface AnimeRatingButtonProps {
  animeId: number;
  rating: AnimeRating;
  onRated: (rating: AnimeRating) => void;
}

/**
 * Рейтинг тайтла с плашкой своей оценки; клик открывает окно оценки.
 * Без входа в аккаунт рейтинг только показывается
 */
function AnimeRatingButton({
  animeId,
  rating,
  onRated,
}: AnimeRatingButtonProps) {
  const { customColors } = useTheme().palette;
  const [open, setOpen] = useState<boolean>(false);
  const authorized = Boolean(animeApi.getCurrentUserId());

  const content = (
    <>
      {rating.user > 0 && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.75,
            borderRadius: '10px',
            backgroundColor: RATING_USER_BADGE,
            color: WHITE,
            fontSize: '0.75rem',
            lineHeight: '17px',
          }}
        >
          <Star sx={{ fontSize: 9, fill: 'currentColor' }} />
          {rating.user}
        </Box>
      )}
      <Star sx={{ color: customColors.warningColor, fontSize: 20 }} />
      <Typography
        sx={{
          color: customColors.dialogTextColor,
          fontSize: '1.125rem',
          fontWeight: 600,
        }}
      >
        {rating.averageFormated}
      </Typography>
      <Typography
        sx={{
          color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
          fontSize: '0.875rem',
        }}
      >
        {rating.votesFormated}
      </Typography>
    </>
  );

  if (!authorized) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {content}
      </Box>
    );
  }

  return (
    <Box
      data-card-actions=""
      onClick={(event) => event.stopPropagation()}
      sx={{ display: 'inline-flex' }}
    >
      <ButtonBase
        aria-label="Оценить тайтл"
        onClick={() => setOpen(true)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.25,
          ml: -1,
          borderRadius: 1.5,
          border: '1px solid transparent',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            backgroundColor: `rgba(${customColors.accentRgb}, 0.14)`,
            borderColor: `rgba(${customColors.accentRgb}, 0.5)`,
          },
        }}
      >
        {content}
      </ButtonBase>

      <AnimeRatingDialog
        open={open}
        animeId={animeId}
        userVote={rating.user}
        onRated={onRated}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
}

export default AnimeRatingButton;
