import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Box,
  Typography,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  Button,
} from '@mui/material';
import { SlidersHorizontal } from '../icons';
import Comments from './Comments';
import CommentsSettingsDialog from './CommentsSettingsDialog';
import useCommentsSettings from '../../hooks/useCommentsSettings';
import { COMMENTS_WIDTH_CSS } from '../../../constants';

import { createLogger } from '../../../shared/logger';

const log = createLogger('CommentsSection');

interface CommentsSectionProps {
  episodeId: number;
  animeSlug: string;
  scrollContainerId: string;
}

/**
 * CommentsSection - Isolated comments component to prevent parent re-renders
 */
const CommentsSection = memo(
  ({ episodeId, animeSlug, scrollContainerId }: CommentsSectionProps) => {
    const theme = useTheme();
    const [commentsSortOption, setCommentsSortOption] =
      useState<string>('newest');
    const [shouldLoadComments, setShouldLoadComments] =
      useState<boolean>(false);
    const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
    const [commentsSettings, updateCommentsSettings] = useCommentsSettings();
    const commentsContainerRef = useRef<HTMLDivElement>(null);

    /**
     * Reset comments loading flag when episode changes
     */
    useEffect(() => {
      log.debug('Episode changed, resetting load flag');
      setShouldLoadComments(false);
    }, [episodeId]);

    /**
     * Setup IntersectionObserver for comments section
     */
    useEffect(() => {
      if (!commentsContainerRef.current) return undefined;

      const rootElement = scrollContainerId
        ? document.getElementById(scrollContainerId)
        : null;

      if (scrollContainerId && !rootElement) {
        log.warn('Scroll container not found:', scrollContainerId);
        return undefined;
      }

      log.debug(
        'Setting up IntersectionObserver with root:',
        rootElement ? scrollContainerId : 'viewport',
      );

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !shouldLoadComments) {
              log.debug('Visible, loading comments...');
              setShouldLoadComments(true);
            }
          });
        },
        {
          root: rootElement,
          rootMargin: '300px',
          threshold: 0,
        },
      );

      observer.observe(commentsContainerRef.current);

      return () => {
        observer.disconnect();
      };
    }, [shouldLoadComments, scrollContainerId]);

    return (
      <Box
        ref={commentsContainerRef}
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: 3,
          paddingTop: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: COMMENTS_WIDTH_CSS,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              backgroundColor: theme.palette.customColors.primaryColor,
              border: `1px solid ${theme.palette.customColors.lineColor}`,
              margin: 1,
              padding: 2,
              borderRadius: 2,
              marginBottom: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.customColors.primaryTextColor,
                fontWeight: 600,
                fontSize: '1.125rem',
              }}
            >
              Комментарии
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Button
                onClick={() => setSettingsOpen(true)}
                startIcon={<SlidersHorizontal sx={{ fontSize: 18 }} />}
                sx={{
                  color: theme.palette.customColors.accentTextColor,
                  backgroundColor: theme.palette.customColors.mutedColor,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  px: 1.5,
                }}
              >
                Настройки
              </Button>

              <CommentsSettingsDialog
                open={settingsOpen}
                settings={commentsSettings}
                onChange={updateCommentsSettings}
                onClose={() => setSettingsOpen(false)}
              />

              <FormControl size="small">
                <Select
                  value={commentsSortOption}
                  onChange={(e) => setCommentsSortOption(e.target.value)}
                  sx={{
                    minWidth: 150,
                    color: theme.palette.customColors.primaryTextColor,
                    fontSize: '0.875rem',
                    backgroundColor: theme.palette.customColors.mutedColor,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: `rgba(${theme.palette.customColors.onSurfaceRgb}, 0.19)`,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: `rgba(${theme.palette.customColors.accentRgb}, 0.31)`,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.customColors.secondaryColor,
                    },
                    '& .MuiSelect-icon': {
                      color: theme.palette.customColors.accentTextColor,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor:
                          theme.palette.customColors.primaryColor,
                        borderRadius: 2,
                        marginTop: 1,
                        '& .MuiMenuItem-root': {
                          color: theme.palette.customColors.primaryTextColor,
                          fontSize: '0.875rem',
                          '&:hover': {
                            backgroundColor: `rgba(${theme.palette.customColors.accentRgb}, 0.13)`,
                          },
                          '&.Mui-selected': {
                            backgroundColor: `rgba(${theme.palette.customColors.accentRgb}, 0.19)`,
                            '&:hover': {
                              backgroundColor: `rgba(${theme.palette.customColors.accentRgb}, 0.25)`,
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="popular">Популярные</MenuItem>
                  <MenuItem value="newest">Новые</MenuItem>
                  <MenuItem value="oldest">Старые</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {commentsSettings.disabled ? (
            <Box
              sx={{
                margin: 1,
                padding: 4,
                textAlign: 'center',
                backgroundColor: theme.palette.customColors.mutedColor,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.customColors.accentTextColor,
                  fontSize: '0.9375rem',
                }}
              >
                Комментарии отключены в настройках
              </Typography>
            </Box>
          ) : (
            <Box>
              <Comments
                episodeId={episodeId}
                animeSlug={animeSlug}
                sortOption={commentsSortOption}
                shouldLoad={shouldLoadComments}
                highlightNew={commentsSettings.highlightNew}
                collapseFromLevel={commentsSettings.collapseFromLevel}
              />
            </Box>
          )}
        </Box>
      </Box>
    );
  },
);

CommentsSection.displayName = 'CommentsSection';

export default CommentsSection;
