import React, { useState, useLayoutEffect, useRef } from 'react';
import { Box, Fade } from '@mui/material';

const EDGE_MARGIN = 8;

interface ControlTooltipProps {
  title: string;
  placement?: 'top' | 'left' | 'right';
  children: React.ReactNode;
}

/**
 * Подсказка для кнопок плеера
 * Позиционируется средствами CSS, поэтому работает и в fullscreen
 */
function ControlTooltip({
  title,
  placement = 'top',
  children,
}: ControlTooltipProps) {
  const [open, setOpen] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || placement !== 'top') {
      setOffsetX(0);
      return;
    }

    const element = tooltipRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    let delta = 0;

    if (rect.left < EDGE_MARGIN) {
      delta = EDGE_MARGIN - rect.left;
    } else if (rect.right > window.innerWidth - EDGE_MARGIN) {
      delta = window.innerWidth - EDGE_MARGIN - rect.right;
    }

    if (delta !== 0) {
      setOffsetX((prev) => prev + delta);
    }
  }, [open, placement, title, offsetX]);

  let placementSx;
  if (placement === 'top') {
    placementSx = {
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: `translateX(calc(-50% + ${offsetX}px))`,
    };
  } else if (placement === 'right') {
    placementSx = {
      left: 'calc(100% + 8px)',
      top: '50%',
      transform: 'translateY(-50%)',
    };
  } else {
    placementSx = {
      right: 'calc(100% + 8px)',
      top: '50%',
      transform: 'translateY(-50%)',
    };
  }

  return (
    <Box
      sx={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}

      <Fade in={open} timeout={{ enter: 100, exit: 60 }}>
        <Box
          ref={tooltipRef}
          sx={{
            position: 'absolute',
            ...placementSx,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            backgroundColor: 'rgba(40, 40, 40, 0.95)',
            color: '#fff',
            fontSize: '12px',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          {title}
        </Box>
      </Fade>
    </Box>
  );
}

ControlTooltip.defaultProps = {
  placement: 'top',
};

export default ControlTooltip;
