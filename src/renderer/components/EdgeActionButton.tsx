import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  PLAYER_EDGE_BUTTON_RADIUS,
  PLAYER_EDGE_BUTTON_SIZE,
} from '../../constants';

interface EdgeActionButtonProps {
  side: 'left' | 'right';
  icon: ReactNode;
  label: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  // eslint-disable-next-line react/require-default-props
  color?: string;
  // eslint-disable-next-line react/require-default-props
  active?: boolean;
  // eslint-disable-next-line react/require-default-props
  solid?: boolean;
}

const LABEL_SX = {
  whiteSpace: 'nowrap',
  fontSize: '0.88rem',
  lineHeight: 1,
};

/**
 * Кнопка, примыкающая к кромке кадра и раскрывающая подпись при наведении
 */
function EdgeActionButton({
  side,
  icon,
  label,
  onClick,
  color,
  active = false,
  solid = false,
}: EdgeActionButtonProps) {
  const ghostRef = useRef<HTMLSpanElement | null>(null);
  const [labelWidth, setLabelWidth] = useState<number>(0);
  const [hovered, setHovered] = useState<boolean>(false);

  const expanded = hovered || active;

  const isLeft = side === 'left';
  const radius = `${PLAYER_EDGE_BUTTON_RADIUS}px`;
  const gap = 14;

  useEffect(() => {
    const node = ghostRef.current;

    if (!node) {
      return undefined;
    }

    const measure = () =>
      setLabelWidth(
        Math.max(
          node.offsetWidth,
          Math.ceil(node.getBoundingClientRect().width),
        ) +
          gap +
          1,
      );

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [label]);

  useEffect(() => {
    if (!active) {
      setHovered(false);
    }
  }, [active]);

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onClick(event as unknown as React.MouseEvent<HTMLElement>);
        }
      }}
      onClick={(event) => {
        event.stopPropagation();
        event.currentTarget.blur();
        onClick(event);
      }}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        width: PLAYER_EDGE_BUTTON_SIZE + (expanded ? labelWidth : 0),
        height: PLAYER_EDGE_BUTTON_SIZE,
        color,
        cursor: 'pointer',
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: active
          ? 'rgba(124, 58, 237, 0.28)'
          : `rgba(20, 20, 20, ${solid ? 0.9 : 0.45})`,
        backdropFilter: solid ? 'blur(10px)' : 'none',
        border: `1px solid ${active ? 'rgba(124, 58, 237, 0.6)' : 'rgba(116, 116, 128, 0.33)'}`,
        borderLeft: isLeft ? 'none' : undefined,
        borderRight: isLeft ? undefined : 'none',
        borderRadius: isLeft
          ? `0 ${radius} ${radius} 0`
          : `${radius} 0 0 ${radius}`,
        boxSizing: 'content-box',
        outline: 'none',
        '&:focus-visible': {
          outline: '2px solid rgba(124, 58, 237, 0.8)',
          outlineOffset: '-2px',
        },
        transition:
          'width 0.3s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.25s ease',
        '&:hover': { backgroundColor: 'rgba(55, 55, 55, 0.52)' },
        '&:active': { backgroundColor: 'rgba(55, 55, 55, 0.72)' },
      }}
    >
      <Typography
        component="span"
        ref={ghostRef}
        aria-hidden
        sx={{
          ...LABEL_SX,
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          flex: `0 0 ${PLAYER_EDGE_BUTTON_SIZE}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>

      <Typography
        component="span"
        sx={{
          ...LABEL_SX,
          flexShrink: 0,
          opacity: expanded ? 1 : 0,
          pl: isLeft ? 0 : `${gap}px`,
          pr: isLeft ? `${gap}px` : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export default EdgeActionButton;
