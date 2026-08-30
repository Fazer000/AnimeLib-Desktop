import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommentsManager, Comment } from '../../../services/player';
import { animeApi } from '../../../api/animeApi';
import { buildCommentUrl } from '../../../utils/urlHelpers';
import { COMMENTS_LAST_SEEN_PREFIX } from '../../../../constants';
import type { CommentSubmitData } from '../CommentEditor';
import type { ReplyControls } from './types';
import { createLogger } from '../../../../shared/logger';

const log = createLogger('Comments');

const PAGE_SIZE = 20;

const getSortParams = (option: string) => {
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
};

/** Рекурсивно правит счётчики голосов в дереве комментариев. */
const updateCommentVotes = (
  commentsList: Comment[],
  commentId: number,
  newVote: 0 | 1 | null,
  oldVote: 0 | 1 | undefined,
): Comment[] =>
  commentsList.map((comment) => {
    if (comment.id === commentId) {
      let upDelta = 0;
      let downDelta = 0;

      if (oldVote !== undefined) {
        if (oldVote === 1) upDelta -= 1;
        else downDelta -= 1;
      }

      if (newVote !== null) {
        if (newVote === 1) upDelta += 1;
        else downDelta += 1;
      }

      return {
        ...comment,
        votes: {
          up: Math.max(0, comment.votes.up + upDelta),
          down: Math.max(0, comment.votes.down + downDelta),
        },
      };
    }

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

interface UseCommentsDataOptions {
  episodeId: number;
  animeSlug: string;
  sortOption: string;
  shouldLoad: boolean;
  highlightNew: boolean;
  collapseFromLevel: number;
}

/**
 * Загрузка комментариев, голосование, отправка и модерация.
 * Держит всю работу с данными вне компонента отрисовки.
 */
export function useCommentsData({
  episodeId,
  animeSlug,
  sortOption,
  shouldLoad,
  highlightNew,
  collapseFromLevel,
}: UseCommentsDataOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [displayCount, setDisplayCount] = useState<number>(PAGE_SIZE);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [votingComments, setVotingComments] = useState<Set<number>>(new Set());
  const [userVotes, setUserVotes] = useState<Map<number, 0 | 1>>(new Map());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const displayMoreRef = useRef<HTMLDivElement>(null);

  const commentsManager = useMemo(
    () =>
      new CommentsManager({
        onCommentsLoaded: (newComments, hasMorePages) => {
          setComments(newComments);
          setHasMore(hasMorePages);
        },
        onLoadingChange: setLoading,
        onError: (error) => log.error('Error:', error),
        sortBy: 'id',
        sortType: 'desc',
      }),
    [],
  );

  const handleVote = useCallback(
    async (commentId: number, vote: 0 | 1) => {
      if (votingComments.has(commentId)) return;

      try {
        setVotingComments((prev) => new Set(prev).add(commentId));

        const currentVote = userVotes.get(commentId);
        const newVote = currentVote === vote ? null : vote;

        await animeApi.voteComment(commentId, vote);

        setUserVotes((prev) => {
          const next = new Map(prev);
          if (newVote === null) next.delete(commentId);
          else next.set(commentId, newVote);
          return next;
        });

        setComments((prev) =>
          updateCommentVotes(prev, commentId, newVote, currentVote),
        );
      } catch (error) {
        log.error('Error voting:', error);
      } finally {
        setVotingComments((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    },
    [votingComments, userVotes],
  );

  const handleCommentSubmit = useCallback(
    async (data: CommentSubmitData) => {
      try {
        const result = await animeApi.submitComment(data);
        const created = result?.data?.data;
        log.debug('Comment submitted successfully');

        if (created?.id && created?.user) {
          commentsManager.insertComment(created);
          setDisplayCount((current) => Math.max(current, PAGE_SIZE));
          return;
        }

        log.warn('Incomplete response, reloading comments');
        commentsManager.reset();
        setComments([]);
        setDisplayCount(PAGE_SIZE);
        setHasMore(true);
        await commentsManager.loadComments(episodeId, 1);
      } catch (error) {
        log.error('Error submitting comment:', error);
        throw error;
      }
    },
    [commentsManager, episodeId],
  );

  const handleReplySubmit = useCallback(
    async (data: CommentSubmitData) => {
      await handleCommentSubmit(data);
      setReplyingTo(null);
    },
    [handleCommentSubmit],
  );

  const handleDelete = useCallback(
    async (commentId: number) => {
      try {
        const message = await animeApi.deleteComment(commentId);
        commentsManager.removeComment(commentId);
        setToast(message ?? 'Комментарий был удалён');
      } catch (error) {
        log.error('Error deleting comment:', error);
        setToast('Не удалось удалить комментарий');
      }
    },
    [commentsManager],
  );

  const handleEdit = useCallback(
    async (commentId: number, comment: { type: 'doc'; content: unknown[] }) => {
      try {
        const updated = await animeApi.updateComment(commentId, comment);
        if (updated?.id) {
          commentsManager.updateComment(updated);
        }
      } catch (error) {
        log.error('Error updating comment:', error);
        setToast('Не удалось сохранить изменения');
      }
    },
    [commentsManager],
  );

  const handleCopyLink = useCallback(
    (commentId: number) => {
      const url = buildCommentUrl(animeSlug, episodeId, commentId);
      // eslint-disable-next-line promise/catch-or-return
      navigator.clipboard.writeText(url).then(
        () => setToast('Ссылка скопирована'),
        () => setToast('Не удалось скопировать ссылку'),
      );
    },
    [animeSlug, episodeId],
  );

  const handleIgnore = useCallback(
    async (userId: number | string, note: string) => {
      try {
        await animeApi.ignoreUser(Number(userId), note);
        commentsManager.removeUserComments(userId);
        setToast('Пользователь добавлен в игнор-лист');
      } catch (error) {
        log.error('Error ignoring user:', error);
        setToast('Не удалось добавить в игнор-лист');
      }
    },
    [commentsManager],
  );

  const currentUserId = useMemo(() => animeApi.getCurrentUserId(), []);

  const newSince = useMemo(() => {
    if (!highlightNew) return 0;

    const key = `${COMMENTS_LAST_SEEN_PREFIX}${episodeId}`;
    const stored = Number(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, String(Date.now()));

    return stored;
  }, [episodeId, highlightNew]);

  const replyControls = useMemo<ReplyControls>(
    () => ({
      episodeId,
      animeSlug,
      onCopyLink: handleCopyLink,
      onIgnore: handleIgnore,
      collapseFromLevel,
      newSince,
      replyingTo,
      currentUserId,
      onReplyStart: (commentId: number) =>
        setReplyingTo((current) => (current === commentId ? null : commentId)),
      onReplyCancel: () => setReplyingTo(null),
      onReplySubmit: handleReplySubmit,
      onDelete: handleDelete,
      onEdit: handleEdit,
    }),
    [
      episodeId,
      animeSlug,
      handleCopyLink,
      handleIgnore,
      collapseFromLevel,
      newSince,
      replyingTo,
      currentUserId,
      handleReplySubmit,
      handleDelete,
      handleEdit,
    ],
  );

  useEffect(() => {
    if (!shouldLoad) {
      log.debug('shouldLoad is false, skipping initial load');
      return;
    }

    log.debug('shouldLoad is true, loading comments');
    const { sortBy, sortType } = getSortParams(sortOption);
    commentsManager.updateSortOptions(sortBy, sortType);
    commentsManager.reset();
    setComments([]);
    setDisplayCount(PAGE_SIZE);
    setHasMore(true);
    commentsManager.loadComments(episodeId, 1);
  }, [episodeId, commentsManager, shouldLoad, sortOption]);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    if (!commentsManager.canLoadMore()) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && commentsManager.canLoadMore()) {
          log.debug('Load more triggered');
          commentsManager.loadNextPage();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loading, hasMore, commentsManager, shouldLoad]);

  useEffect(() => {
    if (!displayMoreRef.current) return undefined;
    if (displayCount >= comments.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            log.debug('Showing more comments');
            setDisplayCount((prev) =>
              Math.min(prev + PAGE_SIZE, comments.length),
            );
          }
        });
      },
      { root: null, rootMargin: '300px', threshold: 0 },
    );

    observer.observe(displayMoreRef.current);

    return () => observer.disconnect();
  }, [displayCount, comments.length]);

  return {
    comments,
    visibleComments: comments.slice(0, displayCount),
    hasMoreToDisplay: displayCount < comments.length,
    loading,
    hasMore,
    votingComments,
    userVotes,
    toast,
    setToast,
    replyControls,
    handleVote,
    handleCommentSubmit,
    loadMoreRef,
    displayMoreRef,
  };
}

export default useCommentsData;
