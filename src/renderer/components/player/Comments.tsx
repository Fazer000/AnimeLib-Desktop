/* eslint-disable no-console */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  useTheme,
  IconButton,
} from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { CommentsManager, Comment } from '../../services/player';
import CommentText from './CommentText';
import { animeApi } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import CommentEditor, { CommentSubmitData } from './CommentEditor';

/**
 * Reply item - simplified version for nested replies
 */
const ReplyItem = memo(
  ({
    comment,
    isVoting,
    onVote,
    level = 1,
    userVotes,
  }: {
    comment: Comment;
    isVoting: boolean;
    onVote: (commentId: number, vote: 0 | 1) => void;
    level: number;
    userVotes: Map<number, 0 | 1>;
  }) => {
    const theme = useTheme();
    const voteCount = CommentsManager.getVoteCount(comment);
    const voteColor = CommentsManager.getVoteColor(voteCount);
    const avatarUrl = useImageWithReferer(comment.user.avatar?.url);
    const userVote = userVotes.get(comment.id);

    return (
      <Box
        sx={{
          borderRadius: 2,
          padding: 2,
          marginTop: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {/* Smaller Avatar */}
          <Box
            sx={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: '50%',
              backgroundColor: theme.palette.customColors.dtSecondaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={comment.user.username}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.customColors.dtPrimaryTextColor,
                zIndex: avatarUrl ? -1 : 1,
              }}
            >
              {comment.user.username.charAt(0).toUpperCase()}
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5,
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.customColors.dtPrimaryTextColor,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {comment.user.username}
              </Typography>

              {/* Reply to indicator */}
              {comment.parentUser && (
                <>
                  <Typography
                    sx={{
                      color: theme.palette.customColors.dtAccentTextColor,
                      fontSize: '0.75rem',
                    }}
                  >
                    →
                  </Typography>
                  <Typography
                    sx={{
                      color: theme.palette.customColors.dtAccentTextColor,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                  >
                    @{comment.parentUser}
                  </Typography>
                </>
              )}

              <Typography
                sx={{
                  color: theme.palette.customColors.dtAccentTextColor,
                  fontSize: '0.6875rem',
                  ml: 'auto',
                }}
              >
                {CommentsManager.formatDate(comment.created_at)}
              </Typography>

              {/* Compact votes */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 1,
                  padding: '2px 6px',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => onVote(comment.id, 1)}
                  disabled={isVoting}
                  sx={{
                    padding: '2px',
                    minWidth: 'auto',
                    color: userVote === 1 ? '#4ade80' : 'inherit',
                    '&:hover': { color: '#4ade80' },
                  }}
                >
                  <ArrowUpward sx={{ fontSize: 14 }} />
                </IconButton>
                <Typography
                  sx={{
                    color: voteColor,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    minWidth: '20px',
                    textAlign: 'center',
                  }}
                >
                  {voteCount}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onVote(comment.id, 0)}
                  disabled={isVoting}
                  sx={{
                    padding: '2px',
                    minWidth: 'auto',
                    color: userVote === 0 ? '#f87171' : 'inherit',
                    '&:hover': { color: '#f87171' },
                  }}
                >
                  <ArrowDownward sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Comment text */}
            <Box
              sx={{
                color: theme.palette.customColors.dtPrimaryTextColor,
                fontSize: '0.875rem',
                wordBreak: 'break-word',
                lineHeight: 1.6,
              }}
            >
              <CommentText html={comment.comment} />
            </Box>

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && level < 3 && (
              <Box sx={{ mt: 1 }}>
                {comment.replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    comment={reply}
                    isVoting={isVoting}
                    onVote={onVote}
                    level={level + 1}
                    userVotes={userVotes}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);

ReplyItem.displayName = 'ReplyItem';

/**
 * Single comment item - memoized for performance
 */
const CommentItem = memo(
  ({
    comment,
    isVoting,
    onVote,
    userVotes,
  }: {
    comment: Comment;
    isVoting: boolean;
    onVote: (commentId: number, vote: 0 | 1) => void;
    userVotes: Map<number, 0 | 1>;
  }) => {
    const theme = useTheme();
    const voteCount = CommentsManager.getVoteCount(comment);
    const voteColor = CommentsManager.getVoteColor(voteCount);

    // Load avatar with custom referer
    const avatarUrl = useImageWithReferer(comment.user.avatar?.url);
    const userVote = userVotes.get(comment.id);

    return (
      <Box
        sx={{
          backgroundColor: theme.palette.customColors.dtPrimaryColor,
          borderRadius: 2,
          padding: 2.5,
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
          mx: 1,
          my: 0.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
          }}
        >
          {/* Avatar */}
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: '50%',
              backgroundColor: theme.palette.customColors.dtSecondaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={comment.user.username}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.customColors.dtPrimaryTextColor,
                zIndex: avatarUrl ? -1 : 1,
              }}
            >
              {comment.user.username.charAt(0).toUpperCase()}
            </Box>
          </Box>

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Username, time and votes in one line */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 1,
                paddingBottom: 1,
                borderBottom: `1px solid ${theme.palette.customColors.dtBorderColor}15`,
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.customColors.dtPrimaryTextColor,
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                }}
              >
                {comment.user.username}
              </Typography>
              <Box
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '2px 8px',
                  borderRadius: 1,
                }}
              >
                <Typography
                  sx={{
                    color: theme.palette.customColors.dtAccentTextColor,
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                  }}
                >
                  {CommentsManager.formatDate(comment.created_at)}
                </Typography>
              </Box>

              {/* Votes inline */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  ml: 'auto',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 2,
                  padding: '4px 8px',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => onVote(comment.id, 1)}
                  disabled={isVoting}
                  sx={{
                    padding: '4px',
                    color:
                      userVote === 1
                        ? '#4ade80'
                        : theme.palette.customColors.dtAccentTextColor,
                    backgroundColor:
                      userVote === 1
                        ? 'rgba(74, 222, 128, 0.1)'
                        : 'transparent',
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#4ade80',
                      backgroundColor: 'rgba(74, 222, 128, 0.1)',
                    },
                    '&:active': {
                      transform: 'scale(0.86)',
                    },
                    '&:disabled': {
                      color: theme.palette.customColors.dtAccentTextColor,
                      opacity: 0.5,
                    },
                  }}
                >
                  <ArrowUpward sx={{ fontSize: 18 }} />
                </IconButton>
                <Typography
                  sx={{
                    color: voteColor,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    lineHeight: 1,
                    minWidth: '28px',
                    textAlign: 'center',
                    padding: '0 4px',
                  }}
                >
                  {voteCount}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onVote(comment.id, 0)}
                  disabled={isVoting}
                  sx={{
                    padding: '4px',
                    color:
                      userVote === 0
                        ? '#f87171'
                        : theme.palette.customColors.dtAccentTextColor,
                    backgroundColor:
                      userVote === 0
                        ? 'rgba(248, 113, 113, 0.1)'
                        : 'transparent',
                    borderRadius: 1.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#f87171',
                      backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    },
                    '&:active': {
                      transform: 'scale(0.86)',
                    },
                    '&:disabled': {
                      color: theme.palette.customColors.dtAccentTextColor,
                      opacity: 0.5,
                    },
                  }}
                >
                  <ArrowDownward sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Comment text */}
            <Box
              sx={{
                color: theme.palette.customColors.dtPrimaryTextColor,
                fontSize: '0.9375rem',
                wordBreak: 'break-word',
                lineHeight: 1.7,
              }}
            >
              <CommentText html={comment.comment} />
            </Box>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {comment.replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    comment={reply}
                    isVoting={isVoting}
                    onVote={onVote}
                    level={1}
                    userVotes={userVotes}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);

CommentItem.displayName = 'CommentItem';

interface CommentsProps {
  episodeId: number;
  sortOption: string;
  shouldLoad?: boolean;
}

/**
 * Comments component with infinite scroll
 */
function Comments({ episodeId, sortOption, shouldLoad = true }: CommentsProps) {
  const theme = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [displayCount, setDisplayCount] = useState<number>(20); // Display only 20 at a time
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [votingComments, setVotingComments] = useState<Set<number>>(new Set());
  // Track user votes: commentId -> vote (0 = down, 1 = up, null = no vote)
  const [userVotes, setUserVotes] = useState<Map<number, 0 | 1>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const displayMoreRef = useRef<HTMLDivElement>(null);

  // Get sort parameters based on selected option
  const getSortParams = useCallback((option: string) => {
    switch (option) {
      case 'popular':
        return { sortBy: 'votes_up', sortType: 'desc' };
      case 'newest':
        return { sortBy: 'id', sortType: 'desc' };
      case 'oldest':
        return { sortBy: 'id', sortType: 'asc' };
      default:
        return { sortBy: 'id', sortType: 'desc' };
    }
  }, []);

  // Создаем менеджер комментариев один раз
  const commentsManager = useMemo(
    () =>
      new CommentsManager({
        onCommentsLoaded: (newComments, hasMorePages) => {
          setComments(newComments);
          setHasMore(hasMorePages);
        },
        onLoadingChange: (isLoading) => {
          setLoading(isLoading);
        },
        onError: (error) => {
          console.error('[Comments] Error:', error);
        },
        sortBy: 'votes_up',
        sortType: 'desc',
      }),
    [],
  );

  /**
   * Load comments callback
   */
  const loadComments = useCallback(async () => {
    await commentsManager.loadNextPage();
  }, [commentsManager]);

  /**
   * Recursively update comment votes in the tree
   */
  const updateCommentVotes = useCallback(
    (
      commentsList: Comment[],
      commentId: number,
      newVote: 0 | 1 | null,
      oldVote: 0 | 1 | undefined,
    ): Comment[] => {
      return commentsList.map((comment) => {
        if (comment.id === commentId) {
          let upDelta = 0;
          let downDelta = 0;

          // Calculate vote changes
          if (oldVote !== undefined) {
            // Remove old vote
            if (oldVote === 1) {
              upDelta -= 1;
            } else {
              downDelta -= 1;
            }
          }

          if (newVote !== null) {
            // Add new vote
            if (newVote === 1) {
              upDelta += 1;
            } else {
              downDelta += 1;
            }
          }

          return {
            ...comment,
            votes: {
              up: Math.max(0, comment.votes.up + upDelta),
              down: Math.max(0, comment.votes.down + downDelta),
            },
          };
        }

        // Recursively update replies
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentVotes(
              comment.replies,
              commentId,
              newVote,
              oldVote,
            ),
          };
        }

        return comment;
      });
    },
    [],
  );

  /**
   * Handle vote on comment
   */
  const handleVote = useCallback(
    async (commentId: number, vote: 0 | 1) => {
      // Prevent multiple votes at once
      if (votingComments.has(commentId)) return;

      try {
        setVotingComments((prev) => new Set(prev).add(commentId));

        const currentVote = userVotes.get(commentId);

        // If clicking the same vote button, remove the vote
        const newVote = currentVote === vote ? null : vote;

        await animeApi.voteComment(commentId, vote);

        // Update user votes tracking
        setUserVotes((prev) => {
          const next = new Map(prev);
          if (newVote === null) {
            next.delete(commentId);
          } else {
            next.set(commentId, newVote);
          }
          return next;
        });

        // Update local vote count optimistically (including replies)
        setComments((prev) =>
          updateCommentVotes(prev, commentId, newVote, currentVote),
        );
      } catch (error) {
        console.error('[Comments] Error voting:', error);
      } finally {
        setVotingComments((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    },
    [votingComments, userVotes, updateCommentVotes],
  );

  /**
   * Handle comment submission
   */
  const handleCommentSubmit = useCallback(
    async (data: CommentSubmitData) => {
      try {
        await animeApi.submitComment(data);
        console.log('[Comments] Comment submitted successfully');

        // Reload comments after submission
        commentsManager.reset();
        setComments([]);
        setDisplayCount(20);
        setHasMore(true);
        await commentsManager.loadComments(episodeId, 1);
      } catch (error) {
        console.error('[Comments] Error submitting comment:', error);
        throw error;
      }
    },
    [commentsManager, episodeId],
  );

  /**
   * Reset comments and update sort when sort option changes
   */
  useEffect(() => {
    if (!shouldLoad) return undefined;
    const { sortBy, sortType } = getSortParams(sortOption);
    commentsManager.updateSortOptions(sortBy, sortType);
    commentsManager.reset();
    setComments([]);
    setDisplayCount(20); // Reset display count
    setHasMore(true);
    commentsManager.loadComments(episodeId, 1);
    return undefined;
  }, [sortOption, getSortParams, commentsManager, episodeId, shouldLoad]);

  /**
   * Initial load - только если shouldLoad = true
   */
  useEffect(() => {
    if (shouldLoad) {
      commentsManager.loadComments(episodeId, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId, commentsManager, shouldLoad]);

  /**
   * Setup intersection observer for infinite scroll - только если shouldLoad = true
   */
  useEffect(() => {
    if (!shouldLoad) return undefined;
    if (!commentsManager.canLoadMore()) return undefined;

    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && commentsManager.canLoadMore()) {
        console.log('[Comments] Load more triggered');
        loadComments();
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
  }, [loading, hasMore, loadComments, commentsManager, shouldLoad]);

  /**
   * Setup intersection observer for "show more" button
   */
  useEffect(() => {
    if (!displayMoreRef.current) return undefined;
    if (displayCount >= comments.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            console.log('[Comments] Showing more comments');
            setDisplayCount((prev) => Math.min(prev + 20, comments.length));
          }
        });
      },
      {
        root: null,
        rootMargin: '300px',
        threshold: 0,
      },
    );

    observer.observe(displayMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [displayCount, comments.length]);

  // Get visible comments
  const visibleComments = comments.slice(0, displayCount);
  const hasMoreToDisplay = displayCount < comments.length;

  if (comments.length === 0 && !loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Comment Editor */}
        <CommentEditor episodeId={episodeId} onSubmit={handleCommentSubmit} />

        <Box
          sx={{
            padding: 4,
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 2,
            margin: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.customColors.dtAccentTextColor,
              fontSize: '0.9375rem',
            }}
          >
            Пока нет комментариев
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Comment Editor */}
      <CommentEditor episodeId={episodeId} onSubmit={handleCommentSubmit} />

      {visibleComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isVoting={votingComments.has(comment.id)}
          onVote={handleVote}
          userVotes={userVotes}
        />
      ))}

      {/* Display more trigger */}
      {hasMoreToDisplay && (
        <Box
          ref={displayMoreRef}
          sx={{
            padding: 2,
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.customColors.dtAccentTextColor,
              fontSize: '0.875rem',
            }}
          >
            Загрузка комментариев...
          </Typography>
        </Box>
      )}

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

Comments.defaultProps = {
  shouldLoad: true,
};

export default Comments;
