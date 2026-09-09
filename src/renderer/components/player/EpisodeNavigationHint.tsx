import React from 'react';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '../icons';
import {
  EPISODE_HINT_AREA_WIDTH,
  EPISODE_HINT_BUTTON_SIZE,
  EPISODE_HINT_FONT,
  EPISODE_HINT_ICON_SIZE,
} from '../../../constants';

interface EpisodeNavigationHintProps {
  currentEpisodeIndex: number;
  totalEpisodes: number;
  onEpisodeSelect: (index: number) => void;
  showControls: boolean;
  episodes: Array<{ id: number; number: string; name: string }>;
}

/**
 * Компонент для отображения кнопок переключения эпизодов при наведении
 * на левую и правую часть плеера
 */
function EpisodeNavigationHint({
  currentEpisodeIndex,
  totalEpisodes,
  onEpisodeSelect,
  showControls,
  episodes,
}: EpisodeNavigationHintProps) {
  const [showLeft, setShowLeft] = React.useState(false);
  const [showRight, setShowRight] = React.useState(false);
  const theme = useTheme();
  const hasPrevious = currentEpisodeIndex > 0;
  const hasNext = currentEpisodeIndex < totalEpisodes - 1;

  const previousEpisode = episodes?.[currentEpisodeIndex - 1];
  const nextEpisode = episodes?.[currentEpisodeIndex + 1];

  const handlePreviousClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPrevious) {
      onEpisodeSelect(currentEpisodeIndex - 1);
    }
  };

  const handleNextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasNext) {
      onEpisodeSelect(currentEpisodeIndex + 1);
    }
  };

  const { customColors } = theme.palette;

  const areaStyle = {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    width: EPISODE_HINT_AREA_WIDTH,
    display: 'flex',
    alignItems: 'center',
    zIndex: 800,
    cursor: showControls ? 'pointer' : 'none',
    transition: 'background-color 0.3s ease',
  };

  const buttonStyle = {
    cursor: showControls ? 'pointer' : 'none',
    backgroundColor: `rgba(${customColors.onVideoSurfaceRgb}, 0.45)`,
    border: `1px solid rgba(${customColors.neutralRgb}, 0.33)`,
    color: customColors.onVideoColor,
    width: EPISODE_HINT_BUTTON_SIZE,
    height: EPISODE_HINT_BUTTON_SIZE,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: `rgba(${customColors.neutralRgb}, 0.3)`,
    },
    '&:active': {
      transform: 'scale(0.95)',
    },
  };

  return (
    <>
      {hasPrevious && (
        <Box
          sx={{
            ...areaStyle,
            left: 0,
            justifyContent: 'flex-start',
            paddingLeft: 3,
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: EPISODE_HINT_AREA_WIDTH,
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(to right, rgba(0, 0, 0, 0.4), transparent)',
              opacity: showLeft ? 1 : 0,
              transition: 'opacity 0.3s ease',
              zIndex: 0,
            },
            zIndex: 1,
          }}
          onMouseEnter={() => setShowLeft(true)}
          onMouseLeave={() => setShowLeft(false)}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              opacity: showLeft && showControls ? 1 : 0,
              transform: showLeft ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'all 0.3s ease',
            }}
          >
            <IconButton sx={buttonStyle} onClick={handlePreviousClick}>
              <ChevronLeft sx={{ fontSize: EPISODE_HINT_ICON_SIZE }} />
            </IconButton>
            {previousEpisode && (
              <Typography
                sx={{
                  color: customColors.onVideoColor,
                  fontSize: EPISODE_HINT_FONT,
                  fontWeight: 500,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                  backgroundColor: `rgba(${customColors.onVideoSurfaceRgb}, 0.45)`,
                  padding: '4px 12px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                Эпизод {previousEpisode.number}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {hasNext && (
        <Box
          sx={{
            ...areaStyle,
            right: 0,
            justifyContent: 'flex-end',
            paddingRight: 3,
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: EPISODE_HINT_AREA_WIDTH,
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(to left, rgba(0, 0, 0, 0.4), transparent)',
              opacity: showRight ? 1 : 0,
              transition: 'opacity 0.3s ease',
              zIndex: 0,
            },
            zIndex: 1,
          }}
          onMouseEnter={() => setShowRight(true)}
          onMouseLeave={() => setShowRight(false)}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              opacity: showRight && showControls ? 1 : 0,
              transform: showRight ? 'translateX(0)' : 'translateX(20px)',
              transition: 'all 0.3s ease',
            }}
          >
            <IconButton sx={buttonStyle} onClick={handleNextClick}>
              <ChevronRight sx={{ fontSize: EPISODE_HINT_ICON_SIZE }} />
            </IconButton>
            {nextEpisode && (
              <Typography
                sx={{
                  color: customColors.onVideoColor,
                  fontSize: EPISODE_HINT_FONT,
                  fontWeight: 500,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
                  backgroundColor: `rgba(${customColors.onVideoSurfaceRgb}, 0.45)`,
                  padding: '4px 12px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                Эпизод {nextEpisode.number}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </>
  );
}

export default EpisodeNavigationHint;
