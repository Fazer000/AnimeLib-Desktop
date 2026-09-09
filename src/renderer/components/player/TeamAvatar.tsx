import React from 'react';
import { Box, useTheme } from '@mui/material';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import { PLAYER_TEAM_AVATAR_SIZE } from '../../../constants';

interface TeamAvatarProps {
  name: string;
  coverUrl?: string;
}

/**
 * Логотип команды озвучки, при отсутствии — первая буква названия
 */
function TeamAvatar({ name, coverUrl }: TeamAvatarProps) {
  const { customColors } = useTheme().palette;
  const imageUrl = useImageWithReferer(coverUrl || undefined);

  return (
    <Box
      sx={{
        width: PLAYER_TEAM_AVATAR_SIZE,
        height: PLAYER_TEAM_AVATAR_SIZE,
        flexShrink: 0,
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: customColors.mutedColor,
        color: customColors.accentTextColor,
        fontSize: '0.8125rem',
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </Box>
  );
}

TeamAvatar.defaultProps = { coverUrl: '' };

export default TeamAvatar;
