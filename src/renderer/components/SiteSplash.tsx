import React from 'react';
import { Box, Fade, Typography, useTheme } from '@mui/material';
import type { LibSite } from '../../constants';
import SPLASH_TIMING from '../../constants/splash';
import SiteSplashLogo from './SiteSplashLogo';

interface SiteSplashProps {
  site: LibSite;
  visible: boolean;
  slow: boolean;
}

/** Заставка сайта с переливом света по векторной эмблеме. */
export default function SiteSplash({ site, visible, slow }: SiteSplashProps) {
  const { customColors } = useTheme().palette;
  return (
    <Fade in={visible} timeout={SPLASH_TIMING.exit} unmountOnExit>
      <Box
        role="status"
        aria-label={`Загрузка ${site.name}`}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: customColors.pageColor,
        }}
      >
        <SiteSplashLogo site={site} visible={visible} />
        <Typography
          sx={{
            position: 'absolute',
            top: 'calc(50% + 88px)',
            color: customColors.mutedTextColor,
            fontSize: 14,
            opacity: slow ? 1 : 0,
            transition: 'opacity 260ms',
          }}
        >
          Загрузка {site.name}…
        </Typography>
      </Box>
    </Fade>
  );
}
