import { Box, IconButton, Typography, useTheme } from '@mui/material';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';

interface VoteControlsProps {
  count: number;
  color: string;
  userVote?: 0 | 1;
  disabled: boolean;
  onVote: (vote: 0 | 1) => void;
  variant: 'compact' | 'full';
}

/** Кнопки голосования со счётчиком: компактный вариант для ответов. */
function VoteControls({
  count,
  color,
  userVote,
  disabled,
  onVote,
  variant,
}: VoteControlsProps) {
  const theme = useTheme();
  const isFull = variant === 'full';
  const accent = theme.palette.customColors.dtAccentTextColor;
  const iconSize = isFull ? 18 : 14;

  const buttonSx = (active: boolean, activeColor: string, tint: string) =>
    isFull
      ? {
          padding: '4px',
          color: active ? activeColor : accent,
          backgroundColor: active ? tint : 'transparent',
          borderRadius: 1.5,
          transition: 'all 0.2s ease',
          '&:hover': { color: activeColor, backgroundColor: tint },
          '&:active': { transform: 'scale(0.86)' },
          '&:disabled': { color: accent, opacity: 0.5 },
        }
      : {
          padding: '2px',
          minWidth: 'auto',
          color: active ? activeColor : 'inherit',
          '&:hover': { color: activeColor },
        };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: isFull ? 2 : 1,
        padding: isFull ? '4px 8px' : '2px 6px',
        ...(isFull ? { ml: 'auto' } : {}),
      }}
    >
      <IconButton
        size="small"
        onClick={() => onVote(1)}
        disabled={disabled}
        sx={buttonSx(userVote === 1, '#4ade80', 'rgba(74, 222, 128, 0.1)')}
      >
        <ArrowUpward sx={{ fontSize: iconSize }} />
      </IconButton>

      <Typography
        sx={{
          color,
          fontWeight: isFull ? 700 : 600,
          fontSize: isFull ? '0.875rem' : '0.75rem',
          minWidth: isFull ? '28px' : '20px',
          textAlign: 'center',
          ...(isFull ? { lineHeight: 1, padding: '0 4px' } : {}),
        }}
      >
        {count}
      </Typography>

      <IconButton
        size="small"
        onClick={() => onVote(0)}
        disabled={disabled}
        sx={buttonSx(userVote === 0, '#f87171', 'rgba(248, 113, 113, 0.1)')}
      >
        <ArrowDownward sx={{ fontSize: iconSize }} />
      </IconButton>
    </Box>
  );
}

VoteControls.defaultProps = { userVote: undefined };

export default VoteControls;
