import React from 'react';
import { Box, useTheme } from '@mui/material';
import type { LibSite } from '../../../constants';
import { LIB_SITE_COLORS } from '../../theme/palette';

interface LibSiteIconProps {
  site: LibSite;
  size: number;
}

/**
 * Значок сайта сети: буква на фирменном цвете сайта
 */
function LibSiteIcon({ site, size }: LibSiteIconProps) {
  const { customColors } = useTheme().palette;

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: `${Math.round(size / 4)}px`,
        backgroundColor: LIB_SITE_COLORS[site.siteId],
        color: customColors.whiteColor,
        fontWeight: 800,
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
      }}
    >
      {site.letter}
    </Box>
  );
}

export default LibSiteIcon;
