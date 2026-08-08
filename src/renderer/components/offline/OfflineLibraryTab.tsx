import React, { useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { PlayArrowRounded } from '@mui/icons-material';
import { OfflineAnime } from '../../../constants';
import { offlineCatalog, progressStore } from '../../services/offline';

interface OfflineLibraryTabProps {
  anime: OfflineAnime[];
  onPlay: (animeId: string, episodeId?: number) => void;
}

/**
 * Форматирует позицию просмотра
 */
const formatTime = (seconds: number): string => {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

/**
 * Библиотека скачанного с запуском оффлайн-просмотра
 */
function OfflineLibraryTab({ anime, onPlay }: OfflineLibraryTabProps) {
  const [expandedId, setExpandedId] = useState<string>('');

  if (anime.length === 0) {
    return (
      <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
        Библиотека пока пуста. Откройте аниме в плеере и скачайте серии для
        оффлайн просмотра.
      </Typography>
    );
  }

  return (
    <Box>
      {anime.map((item) => {
        const episodes = offlineCatalog.getEpisodes(item.animeId);
        const progress = progressStore.getLatestForAnime(item.animeId);
        const coverUrl = offlineCatalog.getCoverUrl(item);

        return (
          <Box
            key={item.animeId}
            sx={{
              mb: 1.5,
              pb: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 46,
                  height: 64,
                  flexShrink: 0,
                  borderRadius: 1,
                  overflow: 'hidden',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
                onClick={() =>
                  setExpandedId(expandedId === item.animeId ? '' : item.animeId)
                }
              >
                {coverUrl && (
                  <Box
                    component="img"
                    src={coverUrl}
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  noWrap
                  onClick={() =>
                    setExpandedId(
                      expandedId === item.animeId ? '' : item.animeId,
                    )
                  }
                >
                  {item.title}
                </Typography>
                <Typography
                  sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}
                >
                  {progress
                    ? `${episodes.length} серий · остановились на ${progress.itemNumber} серии (${formatTime(progress.seconds)})`
                    : `${episodes.length} серий`}
                </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                startIcon={<PlayArrowRounded sx={{ fontSize: 16 }} />}
                onClick={() => onPlay(item.animeId, progress?.episodeId)}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  backgroundColor: '#7C3AED',
                  color: '#ffffff',
                  '&:hover': { backgroundColor: '#6D28D9' },
                }}
              >
                {progress ? 'Продолжить' : 'Смотреть'}
              </Button>
            </Box>

            <Collapse in={expandedId === item.animeId}>
              <Box sx={{ pl: 7.5, pt: 1 }}>
                {episodes.map((episode) => (
                  <Box
                    key={episode.id}
                    onClick={() => onPlay(item.animeId, episode.id)}
                    sx={{
                      py: 0.5,
                      cursor: 'pointer',
                      color:
                        progress?.episodeId === episode.id
                          ? '#7C3AED'
                          : 'rgba(255,255,255,0.75)',
                      '&:hover': { color: '#ffffff' },
                    }}
                  >
                    <Typography sx={{ fontSize: '0.78rem' }} noWrap>
                      {`${episode.number} серия${episode.name ? ` · ${episode.name}` : ''}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}

export default OfflineLibraryTab;
