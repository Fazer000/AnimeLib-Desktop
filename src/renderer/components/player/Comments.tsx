import {
  Box,
  CircularProgress,
  Snackbar,
  Typography,
  useTheme,
} from '@mui/material';
import CommentEditor from './CommentEditor';
import CommentItem from './comments/CommentItem';
import { useCommentsData } from './comments/useCommentsData';

const PLACEHOLDER_SX = {
  padding: 4,
  textAlign: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: 2,
  margin: 2,
};

interface CommentsProps {
  episodeId: number;
  animeSlug: string;
  sortOption: string;
  shouldLoad?: boolean;
  highlightNew: boolean;
  collapseFromLevel: number;
}

/**
 * Лента комментариев эпизода с бесконечной прокруткой
 */
function Comments({
  episodeId,
  animeSlug,
  sortOption,
  shouldLoad = true,
  highlightNew,
  collapseFromLevel,
}: CommentsProps) {
  const theme = useTheme();
  const {
    comments,
    visibleComments,
    hasMoreToDisplay,
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
  } = useCommentsData({
    episodeId,
    animeSlug,
    sortOption,
    shouldLoad,
    highlightNew,
    collapseFromLevel,
  });

  const accentColor = theme.palette.customColors.dtAccentTextColor;

  if (!shouldLoad) {
    return (
      <Box sx={PLACEHOLDER_SX}>
        <Typography
          variant="body2"
          sx={{ color: accentColor, fontSize: '0.9375rem' }}
        >
          Прокрутите вниз, чтобы загрузить комментарии
        </Typography>
      </Box>
    );
  }

  if (comments.length === 0 && !loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <CommentEditor episodeId={episodeId} onSubmit={handleCommentSubmit} />

        <Box sx={PLACEHOLDER_SX}>
          <Typography
            variant="body2"
            sx={{ color: accentColor, fontSize: '0.9375rem' }}
          >
            Пока нет комментариев
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <CommentEditor episodeId={episodeId} onSubmit={handleCommentSubmit} />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {visibleComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isVoting={votingComments.has(comment.id)}
          onVote={handleVote}
          userVotes={userVotes}
          replyControls={replyControls}
        />
      ))}

      {hasMoreToDisplay && (
        <Box ref={displayMoreRef} sx={{ padding: 2, textAlign: 'center' }}>
          <Typography sx={{ color: accentColor, fontSize: '0.875rem' }}>
            Загрузка комментариев...
          </Typography>
        </Box>
      )}

      {hasMore && (
        <Box
          ref={loadMoreRef}
          sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}
        >
          {loading && (
            <CircularProgress
              size={24}
              sx={{ color: theme.palette.customColors.dtSecondaryColor }}
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
