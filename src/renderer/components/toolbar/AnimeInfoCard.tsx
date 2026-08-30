import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Star } from '@mui/icons-material';
import { animeApi, AnimeInfo } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';

import { createLogger } from '../../../shared/logger';

const log = createLogger('AnimeInfoCard');

interface AnimeInfoCardProps {
  animeId: string;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  // eslint-disable-next-line react/require-default-props
  onClick?: () => void;
}

function AnimeInfoCard({
  animeId,
  isVisible,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: AnimeInfoCardProps) {
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
            width: 320,
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
      sx={{
        position: 'fixed',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
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
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          width: 'fit-content',
          minWidth: '25vw',
          maxWidth: '50vw',
          pointerEvents: 'auto',
          backgroundColor: 'rgba(35, 34, 34, 0.66)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(24, 24, 24, 0.35)',
          borderRadius: 2,
          padding: 2.5,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
          '&:hover': onClick
            ? {
                backgroundColor: 'rgba(45, 43, 43, 0.75)',
                borderColor: 'rgba(124, 58, 237, 0.4)',
              }
            : undefined,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 180,
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
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
              flexDirection: 'row',
              gap: 1.5,
              minWidth: 0,
            }}
          >
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
                  color: '#fff',
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

                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                />

                <Typography
                  sx={{
                    color: animeInfo.status.id === 2 ? '#4ade80' : '#fbbf24',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                />

                <Typography
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.875rem',
                  }}
                >
                  {animeInfo.releaseDateString}
                </Typography>
              </Box>

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
