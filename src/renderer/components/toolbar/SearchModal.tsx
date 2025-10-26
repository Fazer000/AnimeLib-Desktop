/* eslint-disable no-console */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  TextField,
  IconButton,
  Typography,
  Tab,
  Tabs,
  CircularProgress,
  ButtonBase,
} from '@mui/material';
import { Close, Search, PlayArrowRounded } from '@mui/icons-material';
import { animeApi } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';

interface SearchResult {
  id: number;
  name: string;
  rus_name?: string;
  type?: {
    id: number;
    label: string;
  };
  status?: {
    id: number;
    label: string;
  };
  releaseDate?: string;
  releaseDateString?: string;
  cover?: {
    default: string;
  };
  slug: string;
  slug_url: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  // eslint-disable-next-line react/require-default-props
  onAnimeSelect?: (slugUrl: string, openInPlayer?: boolean) => void;
}

/**
 * SearchResultCard - Компонент карточки результата поиска
 */
function SearchResultCard({
  result,
  onCardClick,
  onPlayerClick,
}: {
  result: SearchResult;
  onCardClick: () => void;
  onPlayerClick: () => void;
}) {
  const coverUrl = useImageWithReferer(result.cover?.default || '');

  return (
    <Box
      sx={{
        display: 'flex',
        mb: 1,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(116, 116, 128, .1)',
        position: 'relative',
      }}
    >
      {/* Main Card with Ripple */}
      <ButtonBase
        onClick={onCardClick}
        sx={{
          display: 'flex',
          gap: 2,
          padding: 1,
          flex: 1,
          justifyContent: 'flex-start',
          textAlign: 'left',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: '#2a2a2a',
          },
        }}
      >
        <Box
          component="img"
          src={coverUrl || result.cover?.default}
          alt={result.name}
          sx={{
            width: 60,
            height: 85,
            borderRadius: 1,
            objectFit: 'cover',
            flexShrink: 0,
            backgroundColor: '#2a2a2a',
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: '#ffffff',
              fontWeight: 500,
              marginBottom: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {result.status?.label || 'Неизвестно'}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#ffffff',
              marginBottom: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {result.rus_name || result.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: '#808080',
              display: 'block',
            }}
          >
            {result.type?.label || ''}{' '}
            {result.releaseDateString || result.releaseDate || ''}
          </Typography>
        </Box>
      </ButtonBase>

      {/* Player Button - Side Panel */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          borderLeft: '1px solid rgb(49, 49, 49)',
        }}
      >
        <ButtonBase
          onClick={(e) => {
            e.stopPropagation();
            onPlayerClick();
          }}
          sx={{
            height: '100%',
            paddingInline: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 20,
              height: '100%',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayArrowRounded
              sx={{
                color: '#ffffff',
                fontSize: 24,
              }}
            />
          </Box>
        </ButtonBase>
      </Box>
    </Box>
  );
}

/**
 * SearchModal - Компонент модального окна поиска аниме
 */
function SearchModal({ open, onClose, onAnimeSelect }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Tabs configuration
  const tabs = ['Тайтлы'];

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setActiveTab(0);
    }
  }, [open]);

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return undefined;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        console.log('[SearchModal] Searching for:', searchQuery);
        const response = await animeApi.searchAnime(searchQuery);
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('[SearchModal] Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAnimeClick = (result: SearchResult, openInPlayer = false) => {
    console.log(
      '[SearchModal] Anime selected:',
      result.slug_url,
      'openInPlayer:',
      openInPlayer,
    );
    if (onAnimeSelect) {
      onAnimeSelect(result.slug_url, openInPlayer);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
      }}
    >
      <Box
        sx={{
          width: '90%',
          maxWidth: 800,
          backgroundColor: '#1e1e1e',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          outline: 'none',
          maxHeight: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo and Search Input */}
        <Box
          sx={{
            padding: 1,
            borderBottom: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Search sx={{ color: '#808080', fontSize: 20 }} />
          <TextField
            autoFocus
            fullWidth
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="standard"
            sx={{
              '& .MuiInput-root': {
                color: '#ffffff',
                fontSize: '16px',
                '&:before': {
                  borderBottom: 'none',
                },
                '&:after': {
                  borderBottom: 'none',
                },
                '&:hover:not(.Mui-disabled):before': {
                  borderBottom: 'none',
                },
              },
              '& .MuiInputBase-input': {
                padding: 0,
                '&::placeholder': {
                  color: '#808080',
                  opacity: 1,
                },
              },
            }}
          />
          <IconButton
            onClick={onClose}
            sx={{
              color: '#808080',
              padding: 0.5,
              '&:hover': {
                color: '#ffffff',
              },
            }}
          >
            <Close sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box
          sx={{
            borderBottom: '1px solid #2a2a2a',
            backgroundColor: '#1a1a1a',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{
              style: {
                height: 3,
                borderRadius: '3px 3px 0 0',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
            }}
            sx={{
              minHeight: 40,
              '& .MuiTabs-indicator': {
                backgroundColor: '#7C3AED',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                color: '#808080',
                textTransform: 'none',
                fontSize: '13px',
                minHeight: 40,
                minWidth: 'auto',
                padding: '8px 16px',
                fontFamily: 'Open Sans, sans-serif',
                transition: 'color 200ms',
                '&.Mui-selected': {
                  color: '#ffffff',
                  fontWeight: 600,
                },
                '&:hover': {
                  color: '#ffffff',
                },
              },
              '& .MuiTabs-scrollButtons': {
                color: '#808080',
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab key={tab} label={tab} />
            ))}
          </Tabs>
        </Box>

        {/* Results */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: 2,
            minHeight: 200,
          }}
        >
          {isSearching && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                padding: 4,
              }}
            >
              <CircularProgress size={32} sx={{ color: '#7C3AED' }} />
            </Box>
          )}

          {!isSearching && searchQuery.length === 0 && (
            <Box
              sx={{
                textAlign: 'center',
                padding: 4,
                color: '#808080',
              }}
            >
              <Typography variant="body2">
                Начните вводить для поиска
              </Typography>
            </Box>
          )}

          {!isSearching &&
            searchQuery.length > 0 &&
            searchResults.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  padding: 4,
                  color: '#808080',
                }}
              >
                <Typography variant="body2">Ничего не найдено</Typography>
              </Box>
            )}

          {searchResults.length > 0 && !isSearching && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                flexShrink: 0,
                marginBottom: 2,
              }}
            >
              <Box
                component="svg"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                sx={{
                  width: 24,
                  height: 24,
                  '& .site-logo__corner': {
                    fill: '#7C3AED',
                  },
                  '& .site-logo__words': {
                    fill: '#ffffff',
                  },
                }}
              >
                <path
                  className="site-logo__corner"
                  d="M220 78v30c0 4.42-3.58 8-8 8h-86c-5.52 0-10 4.48-10 10v86c0 4.42-3.58 8-8 8H78c-4.42 0-8-3.58-8-8V82c0-6.63 5.37-12 12-12h130c4.42 0 8 3.58 8 8zM292 434v-30c0-4.42 3.58-8 8-8h86c5.52 0 10-4.48 10-10v-86c0-4.42 3.58-8 8-8h30c4.42 0 8 3.58 8 8v130c0 6.63-5.37 12-12 12H300c-4.42 0-8-3.58-8-8z"
                />
                <path
                  className="site-logo__words"
                  d="M164.16 354c-1.5 0-2.85-.6-4.06-1.82-1.22-1.21-1.82-2.56-1.82-4.06 0-.93.09-1.77.28-2.52l65.8-179.76c.56-2.05 1.72-3.87 3.5-5.46 1.77-1.58 4.24-2.38 7.42-2.38h41.44c3.17 0 5.64.8 7.42 2.38 1.77 1.59 2.94 3.41 3.5 5.46l65.52 179.76c.37.75.56 1.59.56 2.52 0 1.5-.61 2.85-1.82 4.06-1.21 1.22-2.66 1.82-4.34 1.82h-34.44c-2.8 0-4.9-.7-6.3-2.1-1.4-1.4-2.29-2.66-2.66-3.78l-10.92-28.56h-74.76l-10.64 28.56c-.38 1.12-1.22 2.38-2.52 3.78-1.31 1.4-3.55 2.1-6.72 2.1h-34.44zm65.8-74.76h52.08L256 205.32l-26.04 73.92z"
                />
              </Box>
              <Typography
                sx={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'Open Sans, sans-serif',
                }}
              >
                AnimeLib
              </Typography>
            </Box>
          )}

          {/* Results List */}
          {searchResults.map((result) => (
            <SearchResultCard
              key={result.id}
              result={result}
              onCardClick={() => handleAnimeClick(result, false)}
              onPlayerClick={() => handleAnimeClick(result, true)}
            />
          ))}
        </Box>

        {/* Show More Button (if needed) */}
        {searchResults.length > 0 && (
          <Box
            sx={{
              padding: 2,
              borderTop: '1px solid #2a2a2a',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: '#7C3AED',
                cursor: 'pointer',
                fontSize: '13px',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              + показать ещё {searchResults.length}
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
}

export default SearchModal;
