import React, { useState, useEffect, useRef } from 'react';
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
  useTheme,
} from '@mui/material';
import { BookOpen, Play, Search, SearchX, X } from '../icons';
import EmptyState from '../EmptyState';
import LibSiteIcon from '../sideRail/LibSiteIcon';
import { animeApi, SearchResultItem } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import { LIB_SITES, LibSite } from '../../../constants';
import {
  libSitePageUrl,
  libTitlePageUrl,
  pickSearchSite,
} from '../../utils/libSites';

import { createLogger } from '../../../shared/logger';

const log = createLogger('SearchModal');

const SEARCH_DELAY = 300;
const SEARCH_MIN_LENGTH = 2;
const TAB_ICON_SIZE = 18;

type SiteResults = Record<number, SearchResultItem[]>;

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  currentSiteId: number;
  // eslint-disable-next-line react/require-default-props
  onAnimeSelect?: (slugUrl: string, openInPlayer?: boolean) => void;
  // eslint-disable-next-line react/require-default-props
  onOpenUrl?: (url: string) => void;
}

/**
 * SearchResultCard - Компонент карточки результата поиска
 */
function SearchResultCard({
  result,
  watch,
  busy,
  onCardClick,
  onActionClick,
}: {
  result: SearchResultItem;
  watch: boolean;
  busy: boolean;
  onCardClick: () => void;
  onActionClick: () => void;
}) {
  const coverUrl = useImageWithReferer(result.cover?.default || '');
  const { customColors } = useTheme().palette;
  const ActionIcon = watch ? Play : BookOpen;

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
      <ButtonBase
        onClick={onCardClick}
        sx={{
          display: 'flex',
          gap: 2,
          padding: 1,
          flex: 1,
          minWidth: 0,
          justifyContent: 'flex-start',
          textAlign: 'left',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: customColors.mutedColor,
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
            backgroundColor: customColors.mutedColor,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: customColors.dialogTextColor,
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
              color: customColors.dialogTextColor,
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
              color: customColors.mutedTextColor,
              display: 'block',
            }}
          >
            {result.type?.label || ''}{' '}
            {result.releaseDateString || result.releaseDate || ''}
          </Typography>
        </Box>
      </ButtonBase>

      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          borderLeft: `1px solid ${customColors.lineColor}`,
        }}
      >
        <ButtonBase
          onClick={(e) => {
            e.stopPropagation();
            onActionClick();
          }}
          disabled={busy}
          aria-label={watch ? 'Открыть в плеере' : 'Читать'}
          title={watch ? 'Открыть в плеере' : 'Читать'}
          sx={{
            height: '100%',
            paddingInline: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.18s ease',
            '&:hover': {
              backgroundColor: customColors.accentQuietColor,
              '& .search-action-icon': {
                color: customColors.accentSoftColor,
                transform: 'scale(1.2)',
              },
            },
            '&:active .search-action-icon': {
              transform: 'scale(0.94)',
            },
          }}
        >
          <Box
            sx={{
              width: 24,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? (
              <CircularProgress
                size={18}
                sx={{ color: customColors.accentSoftColor }}
              />
            ) : (
              <ActionIcon
                className="search-action-icon"
                sx={{
                  color: customColors.mutedTextColor,
                  fontSize: 24,
                  transition:
                    'color 0.18s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            )}
          </Box>
        </ButtonBase>
      </Box>
    </Box>
  );
}

/**
 * Поиск тайтла по сайту сети: аниме — через свой поиск, манга и ранобэ —
 * через каталог с Site-Id
 */
const searchSite = (site: LibSite, query: string) =>
  site.kind === 'anime'
    ? animeApi.searchAnime(query).then((response) => response.data || [])
    : animeApi.searchSiteTitles(site.siteId, query);

/**
 * SearchModal - поиск тайтлов по всем сайтам сети, вкладка на каждый сайт
 */
function SearchModal({
  open,
  onClose,
  currentSiteId,
  onAnimeSelect,
  onOpenUrl,
}: SearchModalProps) {
  const { customColors } = useTheme().palette;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSiteId, setActiveSiteId] = useState<number>(currentSiteId);
  const [results, setResults] = useState<SiteResults>({});
  const [pending, setPending] = useState<number[]>([]);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const tabPickedRef = useRef(false);
  const searchIdRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setResults({});
      setPending([]);
      setBusySlug(null);
    } else {
      setActiveSiteId(currentSiteId);
    }
    tabPickedRef.current = false;
  }, [open, currentSiteId]);

  useEffect(() => {
    searchIdRef.current += 1;
    const searchId = searchIdRef.current;

    if (searchQuery.length < SEARCH_MIN_LENGTH) {
      setResults({});
      setPending([]);
      return undefined;
    }

    setPending(LIB_SITES.map((site) => site.siteId));
    const timeoutId = setTimeout(() => {
      log.debug('Searching for:', searchQuery);

      LIB_SITES.forEach(async (site) => {
        let items: SearchResultItem[] = [];
        try {
          items = await searchSite(site, searchQuery);
        } catch (error) {
          log.error('Search error on site', site.siteId, error);
        }

        if (searchIdRef.current !== searchId) return;
        setResults((prev) => ({ ...prev, [site.siteId]: items }));
        setPending((prev) => prev.filter((id) => id !== site.siteId));
      });
    }, SEARCH_DELAY);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (tabPickedRef.current || pending.length > 0) return;
    if (Object.keys(results).length === 0) return;

    const counts: Record<number, number> = {};
    Object.entries(results).forEach(([siteId, items]) => {
      counts[Number(siteId)] = items.length;
    });
    setActiveSiteId(pickSearchSite(counts, currentSiteId));
  }, [results, pending, currentSiteId]);

  const activeSite =
    LIB_SITES.find((site) => site.siteId === activeSiteId) ?? LIB_SITES[0];
  const activeResults = results[activeSiteId] ?? [];
  const isSearching = pending.includes(activeSiteId);

  const handleTabChange = (_event: React.SyntheticEvent, siteId: number) => {
    tabPickedRef.current = true;
    setActiveSiteId(siteId);
  };

  const openUrl = (url: string | null) => {
    if (!url || !onOpenUrl) return;
    log.debug('Opening title page:', url);
    onOpenUrl(url);
    onClose();
  };

  const handleCardClick = (result: SearchResultItem) => {
    if (activeSite.kind === 'anime') {
      log.debug('Anime selected:', result.slug_url);
      onAnimeSelect?.(result.slug_url, false);
      onClose();
      return;
    }

    openUrl(libTitlePageUrl(activeSite.siteId, result.slug_url));
  };

  const handleActionClick = async (result: SearchResultItem) => {
    if (activeSite.kind === 'anime') {
      log.debug('Anime selected for player:', result.slug_url);
      onAnimeSelect?.(result.slug_url, true);
      onClose();
      return;
    }

    const { siteId } = activeSite;
    setBusySlug(result.slug_url);
    try {
      const path = await animeApi.getReadingPath(siteId, result.slug_url);
      openUrl(
        path
          ? libSitePageUrl(siteId, path)
          : libTitlePageUrl(siteId, result.slug_url),
      );
    } catch (error) {
      log.error('Error loading reading path:', error);
      openUrl(libTitlePageUrl(siteId, result.slug_url));
    } finally {
      setBusySlug(null);
    }
  };

  const hasQuery = searchQuery.length > 0;

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
          backgroundColor: customColors.dialogColor,
          border: `1px solid ${customColors.lineColor}`,
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          outline: 'none',
          maxHeight: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            padding: 1,
            borderBottom: `1px solid ${customColors.lineColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Search sx={{ color: customColors.mutedTextColor, fontSize: 20 }} />
          <TextField
            autoFocus
            fullWidth
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="standard"
            sx={{
              '& .MuiInput-root': {
                color: customColors.dialogTextColor,
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
                  color: customColors.mutedTextColor,
                  opacity: 1,
                },
              },
            }}
          />
          <IconButton
            onClick={onClose}
            sx={{
              color: customColors.mutedTextColor,
              padding: 0.5,
              '&:hover': {
                color: customColors.dialogTextColor,
              },
            }}
          >
            <X sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            borderBottom: `1px solid ${customColors.lineColor}`,
          }}
        >
          <Tabs
            value={activeSiteId}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              '& .MuiTabs-indicator': {
                backgroundColor: customColors.accentSoftColor,
                height: 3,
                borderRadius: '3px 3px 0 0',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              },
              '& .MuiTab-root': {
                color: customColors.accentTextColor,
                textTransform: 'none',
                fontSize: '13px',
                minHeight: 40,
                minWidth: 'auto',
                padding: '8px 14px',
                gap: 1,
                fontFamily: 'Open Sans, sans-serif',
                transition: 'color 200ms, opacity 200ms',
                '&.Mui-selected': {
                  color: customColors.accentSoftColor,
                },
                '&:hover': {
                  color: customColors.dialogTextColor,
                },
              },
              '& .MuiTabs-scrollButtons': {
                color: customColors.mutedTextColor,
              },
            }}
          >
            {LIB_SITES.map((site) => {
              const loading = pending.includes(site.siteId);
              const count = results[site.siteId]?.length;
              const empty = hasQuery && !loading && count === 0;

              return (
                <Tab
                  key={site.siteId}
                  value={site.siteId}
                  iconPosition="start"
                  icon={<LibSiteIcon site={site} size={TAB_ICON_SIZE} />}
                  sx={{ opacity: empty ? 0.5 : 1 }}
                  label={
                    <Box
                      component="span"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                    >
                      {site.name}
                      {loading && (
                        <CircularProgress
                          size={10}
                          sx={{ color: customColors.mutedTextColor }}
                        />
                      )}
                      {!loading && count !== undefined && (
                        <Box
                          component="span"
                          sx={{
                            fontSize: '11px',
                            color: customColors.mutedTextColor,
                          }}
                        >
                          {count}
                        </Box>
                      )}
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>

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
              <CircularProgress
                size={32}
                sx={{ color: customColors.accentSoftColor }}
              />
            </Box>
          )}

          {!isSearching && !hasQuery && (
            <EmptyState icon={<Search />} text="Начните вводить для поиска" />
          )}

          {!isSearching && hasQuery && activeResults.length === 0 && (
            <EmptyState icon={<SearchX />} text="Ничего не найдено" />
          )}

          {!isSearching &&
            activeResults.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                watch={activeSite.kind === 'anime'}
                busy={busySlug === result.slug_url}
                onCardClick={() => handleCardClick(result)}
                onActionClick={() => handleActionClick(result)}
              />
            ))}
        </Box>
      </Box>
    </Modal>
  );
}

export default SearchModal;
