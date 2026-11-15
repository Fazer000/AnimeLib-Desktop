import { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import type { TooltipProps, TypographyProps } from '@mui/material';

interface OverflowTextProps extends Omit<TypographyProps, 'children'> {
  children: string;
  tooltipPlacement?: TooltipProps['placement'];
  tooltipEnabled?: boolean;
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
  const measure = (element: HTMLElement) => {
    setClipped(
      element.scrollWidth > element.clientWidth ||
        element.scrollHeight > element.clientHeight,
    );
  };

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
          measure(event.currentTarget);
          onMouseOver?.(event);
        }}
        onFocus={(event) => {
          measure(event.currentTarget);
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
