import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { LIB_SITES, TOOLBAR_HEIGHT } from '../../../constants';
import SPLASH_TIMING from '../../../constants/splash';
import SiteSplash from '../SiteSplash';

interface Props {
  loading: boolean;
}

/** Заставка первоначальной загрузки плеера, без повторов при буферизации. */
export default function PlayerEntrySplash({ loading }: Props) {
  const [visible, setVisible] = useState(true);
  const [slow, setSlow] = useState(false);
  const started = useRef(Date.now());
  useEffect(() => {
    const hint = setTimeout(() => setSlow(true), SPLASH_TIMING.slowHint);
    const safety = setTimeout(() => setVisible(false), SPLASH_TIMING.timeout);
    return () => {
      clearTimeout(hint);
      clearTimeout(safety);
    };
  }, []);
  useEffect(() => {
    if (loading) return undefined;
    const timer = setTimeout(
      () => setVisible(false),
      Math.max(0, SPLASH_TIMING.entry - (Date.now() - started.current)),
    );
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: `${TOOLBAR_HEIGHT}px 0 0`,
        zIndex: 20,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <SiteSplash site={LIB_SITES[0]} visible={visible} slow={slow} />
    </Box>
  );
}
