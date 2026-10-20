import React, { ReactNode } from 'react';
import { Box, ButtonBase, Tooltip, useTheme } from '@mui/material';
import { SIDE_RAIL_BUTTON_SIZE } from '../../../constants';

interface RailButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  // eslint-disable-next-line react/require-default-props
  active?: boolean;
  // eslint-disable-next-line react/require-default-props
  badge?: number;
}

/**
 * Кнопка левой панели с подсказкой справа и необязательным счётчиком
 */
function RailButton({
  label,
  icon,
  onClick,
  active = false,
  badge = 0,
}: RailButtonProps) {
  const { customColors } = useTheme().palette;

  return (
    <Tooltip
      title={active ? '' : label}
      placement="right"
      arrow
      disableInteractive
    >
      <ButtonBase
        aria-label={label}
        onClick={onClick}
        sx={{
          position: 'relative',
          width: SIDE_RAIL_BUTTON_SIZE,
          height: SIDE_RAIL_BUTTON_SIZE,
          flexShrink: 0,
          borderRadius: 2.5,
          color: active
            ? customColors.primaryTextColor
            : customColors.mutedTextColor,
          backgroundColor: active
            ? `rgba(${customColors.accentRgb}, 0.18)`
            : 'transparent',
          border: `1px solid ${
            active ? `rgba(${customColors.accentRgb}, 0.35)` : 'transparent'
          }`,
          transition: 'background-color 0.15s ease, color 0.15s ease',
          '&:hover': {
            color: customColors.primaryTextColor,
            backgroundColor: active
              ? `rgba(${customColors.accentRgb}, 0.18)`
              : `rgba(${customColors.onSurfaceRgb}, 0.08)`,
          },
        }}
      >
        {icon}
        {badge > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 15,
              height: 15,
              px: '3px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: customColors.secondaryColor,
              color: customColors.onAccentColor,
              fontSize: '0.6rem',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {badge > 99 ? '99+' : badge}
          </Box>
        )}
      </ButtonBase>
    </Tooltip>
  );
}

export default RailButton;
