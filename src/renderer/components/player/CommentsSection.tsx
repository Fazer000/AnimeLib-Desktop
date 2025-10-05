/* eslint-disable no-console */
import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Box,
  Typography,
  useTheme,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import Comments from './Comments';

interface CommentsSectionProps {
  episodeId: number;
}

/**
 * CommentsSection - Isolated comments component to prevent parent re-renders
 */
const CommentsSection = memo(({ episodeId }: CommentsSectionProps) => {
  const theme = useTheme();
  const [commentsSortOption, setCommentsSortOption] =
    useState<string>('popular');
  const [shouldLoadComments, setShouldLoadComments] = useState<boolean>(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Reset comments loading flag when episode changes
   */
  useEffect(() => {
    setShouldLoadComments(false);
  }, [episodeId]);

  /**
   * Setup IntersectionObserver for comments section
   */
  useEffect(() => {
    if (!commentsContainerRef.current) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadComments) {
            console.log('[CommentsSection] Visible, loading...');
            setShouldLoadComments(true);
          }
        });
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0,
      },
    );

    observer.observe(commentsContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoadComments]);

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

          {/* Sort selector */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
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
        <Box>
          <Comments
            episodeId={episodeId}
            sortOption={commentsSortOption}
            shouldLoad={shouldLoadComments}
          />
        </Box>
      </Box>
    </Box>
  );
});

CommentsSection.displayName = 'CommentsSection';

export default CommentsSection;
