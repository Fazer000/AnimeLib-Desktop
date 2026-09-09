import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, useTheme } from '@mui/material';
import { Star } from '../icons';
import { animeApi, AnimeInfo } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import {
  ANIME_CARD_COVER_HEIGHT,
  ANIME_CARD_COVER_WIDTH,
  ANIME_CARD_MAX_WIDTH,
  ANIME_CARD_MIN_WIDTH,
} from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('AnimeInfoCard');

interface AnimeInfoCardProps {
  animeId: string;
  topOffset: number;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  // eslint-disable-next-line react/require-default-props
  onClick?: () => void;
}

/**
 * Карточка аниме, выезжающая из-под шапки приложения
 */
function AnimeInfoCard({
  animeId,
  topOffset,
  isVisible,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: AnimeInfoCardProps) {
  const { customColors } = useTheme().palette;
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const coverUrl = useImageWithReferer(animeInfo?.cover?.default);

  useEffect(() => {
    if (!isVisible || !animeId || animeInfo) return;

    const loadAnimeInfo = async () => {
      setLoading(true);
      try {
        const response = await animeApi.getAnimeInfo(animeId);
        setAnimeInfo(response.data);
      } catch (error) {
        log.error('Error loading anime info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnimeInfo();
  }, [isVisible, animeId, animeInfo]);

  if (!animeInfo && !loading) return null;

  const panelSx = {
    position: 'fixed' as const,
    top: topOffset,
    left: 0,
    right: 0,
    zIndex: 1200,
    backgroundColor: customColors.headerColor,
    borderBottom: `1px solid ${customColors.lineColor}`,
    transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
  };

  if (!animeInfo) {
    return (
      <Box
        sx={{
          ...panelSx,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: ANIME_CARD_COVER_HEIGHT,
        }}
      >
        <CircularProgress
          size={30}
          sx={{ color: customColors.accentSoftColor }}
        />
      </Box>
    );
  }

  return (
    <Box
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        ...panelSx,
        display: 'flex',
        justifyContent: 'center',
        padding: 1.5,
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          gap: 3,
          alignItems: 'center',
          minWidth: ANIME_CARD_MIN_WIDTH,
          maxWidth: ANIME_CARD_MAX_WIDTH,
          padding: 1,
          borderRadius: 2,
          border: '1px solid transparent',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
          '&:hover': onClick
            ? {
                backgroundColor: `rgba(${customColors.accentRgb}, 0.14)`,
                borderColor: `rgba(${customColors.accentRgb}, 0.5)`,
              }
            : undefined,
        }}
      >
        <Box
          sx={{
            width: ANIME_CARD_COVER_WIDTH,
            height: ANIME_CARD_COVER_HEIGHT,
            borderRadius: 2,
            overflow: 'hidden',
            flexShrink: 0,
            border: `1px solid ${customColors.lineColor}`,
          }}
        >
          <img
            src={coverUrl || animeInfo.cover.default}
            alt={animeInfo.rus_name || animeInfo.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 0,
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: customColors.dialogTextColor,
              fontWeight: 600,
              fontSize: '1.5rem',
              lineHeight: 1.2,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {animeInfo.rus_name || animeInfo.name}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                color: `rgba(${customColors.onSurfaceRgb}, 0.6)`,
                fontSize: '0.875rem',
              }}
            >
              {animeInfo.type.label}
            </Typography>

            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.3)`,
              }}
            />

            <Typography
              sx={{
                color:
                  animeInfo.status.id === 2
                    ? customColors.successColor
                    : customColors.warningColor,
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {animeInfo.status.label}
            </Typography>

            <Box
              sx={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.3)`,
              }}
            />

            <Typography
              sx={{
                color: `rgba(${customColors.onSurfaceRgb}, 0.6)`,
                fontSize: '0.875rem',
              }}
            >
              {animeInfo.releaseDateString}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star sx={{ color: customColors.warningColor, fontSize: 20 }} />
            <Typography
              sx={{
                color: customColors.dialogTextColor,
                fontSize: '1.125rem',
                fontWeight: 600,
              }}
            >
              {animeInfo.rating.averageFormated}
            </Typography>
            <Typography
              sx={{
                color: `rgba(${customColors.onSurfaceRgb}, 0.5)`,
                fontSize: '0.875rem',
              }}
            >
              {animeInfo.rating.votesFormated}
            </Typography>
            {animeInfo.ageRestriction && (
              <>
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: `rgba(${customColors.onSurfaceRgb}, 0.3)`,
                  }}
                />
                <Box
                  sx={{
                    padding: '2px 8px',
                    backgroundColor: `rgba(${customColors.dangerRgb}, 0.2)`,
                    border: `1px solid rgba(${customColors.dangerRgb}, 0.4)`,
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    sx={{
                      color: customColors.dangerColor,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {animeInfo.ageRestriction.label}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default AnimeInfoCard;
