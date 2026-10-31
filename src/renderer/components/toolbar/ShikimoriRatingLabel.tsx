import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import ShikimoriLogo from '../ShikimoriLogo';
import useShikimoriRating from '../../hooks/useShikimoriRating';
import { formatShikimoriScore } from '../../utils/shikimoriRating';

interface ShikimoriRatingLabelProps {
  shikimoriHref: string | null | undefined;
}

/** Оценка тайтла на Shikimori с числом голосов; только показывается */
function ShikimoriRatingLabel({ shikimoriHref }: ShikimoriRatingLabelProps) {
  const { customColors } = useTheme().palette;
  const rating = useShikimoriRating(shikimoriHref);

  if (!rating) return null;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <ShikimoriLogo
        sx={{ fontSize: 20, color: customColors.dialogTextColor }}
      />
      <Typography
        sx={{
          color: customColors.dialogTextColor,
          fontSize: '1.125rem',
          fontWeight: 600,
        }}
      >
        {formatShikimoriScore(rating.score)}
      </Typography>
      <Typography
        sx={{
          color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
          fontSize: '0.875rem',
        }}
      >
        {rating.votes}
      </Typography>
    </Box>
  );
}

export default ShikimoriRatingLabel;
