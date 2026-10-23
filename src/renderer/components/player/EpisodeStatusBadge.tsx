import React from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';
import { getEpisodeBadge } from '../../utils/episodeBadge';

interface EpisodeStatusBadgeProps {
  status?: { abbr: string | null; label: string } | null;
}

/** Плашка статуса серии с подсказкой */
function EpisodeStatusBadge({ status = null }: EpisodeStatusBadgeProps) {
  const { customColors } = useTheme().palette;
  const badge = getEpisodeBadge(status);

  if (!badge) return null;

  return (
    <Tooltip
      title={badge.label}
      placement="top"
      slotProps={{
        popper: {
          container: () => document.fullscreenElement ?? document.body,
        },
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
        sx={{
          flexShrink: 0,
          minWidth: 16,
          height: 16,
          px: 0.5,
          boxSizing: 'border-box',
          borderRadius: '3px',
          fontSize: '0.65rem',
          fontWeight: 700,
          lineHeight: '16px',
          textAlign: 'center',
          color: customColors.whiteColor,
          backgroundColor: customColors.blueColor,
        }}
      >
        {badge.abbr}
      </Box>
    </Tooltip>
  );
}

EpisodeStatusBadge.defaultProps = {
  status: null,
};

export default EpisodeStatusBadge;
