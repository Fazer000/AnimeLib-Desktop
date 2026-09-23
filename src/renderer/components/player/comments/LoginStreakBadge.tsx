import React, { useId } from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import {
  LOGIN_STREAK_BADGE_HEIGHT,
  LOGIN_STREAK_BADGE_WIDTH,
} from '../../../../constants';
import {
  LoginStreakInfo,
  LoginStreakPreferences,
  StreakValueSize,
  formatStreakTooltip,
  formatStreakValue,
  getActiveStreak,
  getStreakTier,
  getStreakValueSize,
  isGradientColors,
  resolveStreakColors,
} from '../../../utils/loginStreak';

const FLAME_PATH =
  'M12 1.5C12.6 5 16.8 7.2 18.6 11.1C20.9 16 17.7 22.5 12 22.5C6.3 22.5 3.1 16.4 5.2 11.8C6 10 7.3 8.8 8.4 7.6C8.3 9.4 8.9 10.8 10 11.6C9.9 7.9 10.6 4.4 12 1.5Z';

const CORE_PATH =
  'M12 10.4C13.6 12.4 16 13.9 16 16.9C16 19.2 14.2 20.9 12 20.9C9.8 20.9 8 19.2 8 16.9C8 14.5 10.2 12.9 12 10.4Z';

const VALUE_FONT_SIZE: Record<StreakValueSize, string> = {
  normal: '11px',
  compact: '9.5px',
  ultra: '8.5px',
};

interface LoginStreakBadgeProps {
  streak?: LoginStreakInfo | null;
  preferences?: LoginStreakPreferences | null;
}

/**
 * Значок серии ежедневных входов у имени автора: пламя с числом дней,
 * цвет по уровню серии и личному стилю автора
 */
function LoginStreakBadge({
  streak = null,
  preferences = null,
}: LoginStreakBadgeProps) {
  const theme = useTheme();
  const gradientId = `streak-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const days = getActiveStreak(streak);

  if (days === null) return null;

  const tier = getStreakTier(days);
  const colors = resolveStreakColors(preferences, tier, theme.palette.mode);
  const value = formatStreakValue(days);
  const tooltip = formatStreakTooltip(days);
  const gradient = isGradientColors(colors);
  const halo = gradient ? colors[3] : colors[1];
  const { customColors } = theme.palette;

  return (
    <Tooltip
      title={tooltip}
      placement="top"
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: customColors.elevatedSurfaceColor,
            color: customColors.primaryTextColor,
            border: `1px solid ${customColors.lineColor}`,
            fontSize: '0.75rem',
          },
        },
      }}
    >
      <Box
        component="span"
        role="img"
        aria-label={tooltip}
        sx={{
          position: 'relative',
          display: 'inline-flex',
          flexShrink: 0,
          width: LOGIN_STREAK_BADGE_WIDTH,
          height: LOGIN_STREAK_BADGE_HEIGHT,
          cursor: 'help',
          userSelect: 'none',
        }}
      >
        <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
          {gradient && (
            <defs>
              <linearGradient
                id={`${gradientId}-outer`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor={colors[0]} />
                <stop offset="1" stopColor={colors[1]} />
              </linearGradient>
              <linearGradient
                id={`${gradientId}-core`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor={colors[2]} />
                <stop offset="1" stopColor={colors[3]} />
              </linearGradient>
            </defs>
          )}
          <path
            d={FLAME_PATH}
            fill={gradient ? `url(#${gradientId}-outer)` : colors[0]}
          />
          <path
            d={CORE_PATH}
            fill={gradient ? `url(#${gradientId}-core)` : colors[1]}
          />
        </svg>

        <Box
          component="span"
          sx={{
            position: 'absolute',
            left: '50%',
            top: '64%',
            transform: 'translate(-50%, -50%)',
            fontSize: VALUE_FONT_SIZE[getStreakValueSize(value)],
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.2px',
            fontVariantNumeric: 'tabular-nums',
            color: gradient ? colors[4] : colors[2],
            textShadow: `0 0 1.5px ${halo}, 0 0 1.5px ${halo}`,
          }}
        >
          {value}
        </Box>
      </Box>
    </Tooltip>
  );
}

LoginStreakBadge.defaultProps = {
  streak: null,
  preferences: null,
};

export default LoginStreakBadge;
