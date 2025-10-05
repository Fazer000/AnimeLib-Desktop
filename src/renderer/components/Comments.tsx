/* eslint-disable no-console */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  useTheme,
  IconButton,
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { animeApi } from '../api/animeApi';

interface CommentsProps {
  episodeId: number;
}

interface Comment {
  id: number;
  comment: string;
  created_at: string;
  user: {
    username: string;
    avatar: {
      url: string;
    };
    premium: {
      enabled: boolean;
    };
  };
  votes: {
    up: number;
    down: number;
  };
}

/**
 * Comments component with infinite scroll
 */
function Comments({ episodeId }: CommentsProps) {
  const theme = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  /**
   * Load comments from API
   */
  const loadComments = useCallback(
    async (pageNum: number) => {
      if (loading || !hasMore) return;

      try {
        setLoading(true);
        console.log('[Comments] Loading page:', pageNum);
        const response = await animeApi.getEpisodeComments(episodeId, pageNum);

        const newComments = response.data.root;
        setComments((prev) =>
          pageNum === 1 ? newComments : [...prev, ...newComments],
        );
        setHasMore(response.meta.has_next_page);
        setPage(pageNum + 1);

        console.log('[Comments] Loaded comments:', newComments.length);
      } catch (error) {
        console.error('[Comments] Error loading comments:', error);
      } finally {
        setLoading(false);
      }
    },
    [episodeId, loading, hasMore],
  );

  /**
   * Initial load
   */
  useEffect(() => {
    loadComments(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId]);

  /**
   * Setup intersection observer for infinite scroll
   */
  useEffect(() => {
    if (loading || !hasMore) return undefined;

    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && hasMore) {
        console.log('[Comments] Load more triggered');
        loadComments(page);
      }
    }, options);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, page, loadComments]);

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Strip HTML tags and decode entities
   */
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  if (comments.length === 0 && !loading) {
    return (
      <Box
        sx={{
          padding: 3,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.customColors.dtAccentTextColor,
          }}
        >
          Пока нет комментариев
        </Typography>
      </Box>
    );
  }

  const getVoteCount = (comment: Comment) => {
    return comment.votes.up - comment.votes.down;
  };

  const getVoteColor = (count: number) => {
    if (count > 0) return '#4ade80'; // green
    if (count < 0) return '#f87171'; // red
    return theme.palette.customColors.dtAccentTextColor;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {comments.map((comment, index) => {
        const voteCount = getVoteCount(comment);
        return (
          <Box key={comment.id}>
            <Box
              sx={{
                display: 'flex',
                padding: '20px 0',
                gap: 2,
              }}
            >
              {/* Avatar */}
              <Avatar
                src={comment.user.avatar.url}
                alt={comment.user.username}
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                }}
              />

              {/* Content */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {/* Username and time */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: theme.palette.customColors.dtPrimaryTextColor,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    {comment.user.username}
                  </Typography>
                  <Typography
                    sx={{
                      color: theme.palette.customColors.dtAccentTextColor,
                      fontSize: '0.75rem',
                    }}
                  >
                    {formatDate(comment.created_at)}
                  </Typography>
                </Box>

                {/* Comment text */}
                <Typography
                  sx={{
                    color: theme.palette.customColors.dtPrimaryTextColor,
                    fontSize: '0.875rem',
                    mb: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.6,
                  }}
                >
                  {stripHtml(comment.comment)}
                </Typography>

                {/* Actions */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: theme.palette.customColors.dtAccentTextColor,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': {
                        color: theme.palette.customColors.dtPrimaryTextColor,
                      },
                    }}
                  >
                    ответить
                  </Typography>
                  <Typography
                    sx={{
                      color: theme.palette.customColors.dtAccentTextColor,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': {
                        color: theme.palette.customColors.dtPrimaryTextColor,
                      },
                    }}
                  >
                    жалоба
                  </Typography>
                  <Box
                    sx={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor:
                        theme.palette.customColors.dtAccentTextColor,
                      opacity: 0.5,
                    }}
                  />
                  <Box
                    sx={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor:
                        theme.palette.customColors.dtAccentTextColor,
                      opacity: 0.5,
                    }}
                  />
                  <Box
                    sx={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor:
                        theme.palette.customColors.dtAccentTextColor,
                      opacity: 0.5,
                    }}
                  />
                </Box>
              </Box>

              {/* Votes */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  minWidth: 32,
                  paddingTop: '2px',
                }}
              >
                <IconButton
                  size="small"
                  sx={{
                    padding: '2px',
                    color: theme.palette.customColors.dtAccentTextColor,
                    '&:hover': {
                      color: theme.palette.customColors.dtPrimaryTextColor,
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <ArrowUpward sx={{ fontSize: 20 }} />
                </IconButton>
                <Typography
                  sx={{
                    color: getVoteColor(voteCount),
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    lineHeight: 1,
                  }}
                >
                  {voteCount}
                </Typography>
                <IconButton
                  size="small"
                  sx={{
                    padding: '2px',
                    color: theme.palette.customColors.dtAccentTextColor,
                    '&:hover': {
                      color: theme.palette.customColors.dtPrimaryTextColor,
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <ArrowDownward sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Divider */}
            {index < comments.length - 1 && (
              <Box
                sx={{
                  height: '1px',
                  backgroundColor: theme.palette.customColors.dtBorderColor,
                  opacity: 0.2,
                }}
              />
            )}
          </Box>
        );
      })}

      {/* Load more trigger */}
      {hasMore && (
        <Box
          ref={loadMoreRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: 2,
          }}
        >
          {loading && (
            <CircularProgress
              size={24}
              sx={{
                color: theme.palette.customColors.dtSecondaryColor,
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

export default Comments;
