import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  NotificationsOutlined,
  BookmarkBorderOutlined,
  Star,
} from '@mui/icons-material';
import { animeApi, AnimeInfo } from '../../api/animeApi';

interface AnimeInfoCardProps {
  animeId: string;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Карточка с подробной информацией об аниме
 * Отображается при наведении на toolbar
 */
function AnimeInfoCard({
  animeId,
  isVisible,
  onMouseEnter,
  onMouseLeave,
}: AnimeInfoCardProps) {
  const theme = useTheme();
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Загрузка информации об аниме
   */
  useEffect(() => {
    if (!isVisible || !animeId || animeInfo) return;

    const loadAnimeInfo = async () => {
      setLoading(true);
      try {
        const response = await animeApi.getAnimeInfo(animeId);
        setAnimeInfo(response.data);
      } catch (error) {
        console.error('[AnimeInfoCard] Error loading anime info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnimeInfo();
  }, [isVisible, animeId, animeInfo]);

  if (!isVisible) return null;
  if (loading || !animeInfo) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 40,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            width: '90%',
            maxWidth: '1200px',
            backgroundColor: 'rgba(28, 28, 28, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            padding: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(116, 116, 128, 0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress size={30} sx={{ color: '#7C3AED' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        position: 'fixed',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'auto',
        animation: 'fadeInDown 0.2s ease-out',
        '@keyframes fadeInDown': {
          '0%': {
            opacity: 0,
            transform: 'translateY(-10px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
    >
      <Box
        sx={{
          width: '90%',
          maxWidth: '900px',
          backgroundColor: theme.palette.customColors.dtHeaderColor,
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          padding: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(116, 116, 128, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Cover Image */}
          <Box
            sx={{
              width: 100,
              height: 150,
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            }}
          >
            <img
              src={animeInfo.cover.default}
              alt={animeInfo.rus_name || animeInfo.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>

          {/* Info Section */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              gap: 1.5,
              width: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Title */}
              <Typography
                variant="h5"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1.5rem',
                  lineHeight: 1.2,
                }}
              >
                {animeInfo.rus_name || animeInfo.name}
              </Typography>

              {/* Meta Info */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {/* Type */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {animeInfo.type.label}
                  </Typography>
                </Box>

                {/* Separator */}
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                />

                {/* Status */}
                <Typography
                  sx={{
                    color: animeInfo.status.id === 2 ? '#4ade80' : '#fbbf24',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {animeInfo.status.label}
                </Typography>

                {/* Separator */}
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                />

                {/* Release Date */}
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.875rem',
                  }}
                >
                  {animeInfo.releaseDateString}
                </Typography>
              </Box>

              {/* Rating */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star sx={{ color: '#fbbf24', fontSize: 20 }} />
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                  }}
                >
                  {animeInfo.rating.averageFormated}
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.875rem',
                  }}
                >
                  {animeInfo.rating.votesFormated}
                </Typography>
                {/* Age Restriction */}
                {animeInfo.ageRestriction && (
                  <>
                    <Box
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                    <Box
                      sx={{
                        padding: '2px 8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          color: '#ef4444',
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
      </Box>
    </Box>
  );
}

export default AnimeInfoCard;
