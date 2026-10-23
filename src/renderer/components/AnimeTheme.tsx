import React, { ReactNode, useMemo } from 'react';
import { ThemeProvider } from '@mui/material';
import useColorScheme from '../hooks/useColorScheme';
import { createAppTheme } from '../theme/appTheme';

/** Фиолетовая тема AnimeLib для плеера и аниме-окон */
function AnimeTheme({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => createAppTheme(scheme), [scheme]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

export default AnimeTheme;
