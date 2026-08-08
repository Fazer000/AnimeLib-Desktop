/* eslint-disable no-console */
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
import { TuneRounded } from '@mui/icons-material';
import Comments from './Comments';
import CommentsSettingsDialog from './CommentsSettingsDialog';
import useCommentsSettings from '../../hooks/useCommentsSettings';

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
      console.log('[CommentsSection] Episode changed, resetting load flag');
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
        console.warn(
          '[CommentsSection] Scroll container not found:',
          scrollContainerId,
        );
        return undefined;
      }

      console.log(
        '[CommentsSection] Setting up IntersectionObserver with root:',
        rootElement ? scrollContainerId : 'viewport',
      );

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !shouldLoadComments) {
              console.log('[CommentsSection] Visible, loading comments...');
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
            width: '70%',
            maxWidth: '1200px',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              backgroundColor: theme.palette.customColors.dtPrimaryColor,
              boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
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
                color: theme.palette.customColors.dtPrimaryTextColor,
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
                startIcon={<TuneRounded sx={{ fontSize: 18 }} />}
                sx={{
                  color: theme.palette.customColors.dtAccentTextColor,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
                    color: theme.palette.customColors.dtPrimaryTextColor,
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${theme.palette.customColors.dtBorderColor}30`,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${theme.palette.customColors.dtSecondaryColor}50`,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.customColors.dtSecondaryColor,
                    },
                    '& .MuiSelect-icon': {
                      color: theme.palette.customColors.dtAccentTextColor,
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor:
                          theme.palette.customColors.dtPrimaryColor,
                        borderRadius: 2,
                        marginTop: 1,
                        '& .MuiMenuItem-root': {
                          color: theme.palette.customColors.dtPrimaryTextColor,
                          fontSize: '0.875rem',
                          '&:hover': {
                            backgroundColor: `${theme.palette.customColors.dtSecondaryColor}20`,
                          },
                          '&.Mui-selected': {
                            backgroundColor: `${theme.palette.customColors.dtSecondaryColor}30`,
                            '&:hover': {
                              backgroundColor: `${theme.palette.customColors.dtSecondaryColor}40`,
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
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.customColors.dtAccentTextColor,
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
