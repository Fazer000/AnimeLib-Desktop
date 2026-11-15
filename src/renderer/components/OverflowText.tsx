import { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import type { TooltipProps, TypographyProps } from '@mui/material';

interface OverflowTextProps extends Omit<TypographyProps, 'children'> {
  children: string;
  tooltipPlacement?: TooltipProps['placement'];
  tooltipEnabled?: boolean;
}

/** Отличает скрытые строки от выступающих за строку частей букв. */
function isTextClipped(element: HTMLElement): boolean {
  if (element.scrollWidth > element.clientWidth + 1) return true;

  const overflow = element.scrollHeight - element.clientHeight;
  if (overflow <= 1) return false;

  const { lineHeight, webkitLineClamp } = getComputedStyle(element);
  const lineHeightPx = parseFloat(lineHeight);
  return Number(webkitLineClamp) > 0 && Number.isFinite(lineHeightPx)
    ? overflow > lineHeightPx / 2
    : true;
}

/** Показывает полный текст, если он обрезан по ширине или высоте. */
function OverflowText({
  children,
  tooltipPlacement = 'top-start',
  tooltipEnabled = true,
  onMouseOver,
  onFocus,
  ...typographyProps
}: OverflowTextProps) {
  const [clipped, setClipped] = useState(false);

  return (
    <Tooltip
      title={tooltipEnabled && clipped ? children : ''}
      placement={tooltipPlacement}
      arrow
      disableInteractive
      slotProps={{
        popper: {
          container: () => document.fullscreenElement ?? document.body,
        },
        tooltip: { sx: { overflowWrap: 'anywhere' } },
      }}
    >
      <Typography
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...typographyProps}
        onMouseOver={(event) => {
          setClipped(isTextClipped(event.currentTarget));
          onMouseOver?.(event);
        }}
        onFocus={(event) => {
          setClipped(isTextClipped(event.currentTarget));
          onFocus?.(event);
        }}
      >
        {children}
      </Typography>
    </Tooltip>
  );
}

OverflowText.defaultProps = {
  tooltipPlacement: 'top-start',
  tooltipEnabled: true,
};

export default OverflowText;
