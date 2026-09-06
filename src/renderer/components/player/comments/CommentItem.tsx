import { memo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { CommentsManager, Comment } from '../../../services/player';
import CommentText from '../CommentText';
import CommentActions from './CommentActions';
import CommentAvatar from './CommentAvatar';
import VoteControls from './VoteControls';
import RepliesThread, { countReplies } from './RepliesThread';
import ReplyItem from './ReplyItem';
import type { ReplyControls } from './types';

interface CommentItemProps {
  comment: Comment;
  isVoting: boolean;
  onVote: (commentId: number, vote: 0 | 1) => void;
  userVotes: Map<number, 0 | 1>;
  replyControls: ReplyControls;
}

/** Карточка комментария верхнего уровня со своей веткой ответов. */
const CommentItem = memo(
  ({
    comment,
    isVoting,
    onVote,
    userVotes,
    replyControls,
  }: CommentItemProps) => {
    const theme = useTheme();
    const voteCount = CommentsManager.getVoteCount(comment);
    const isNew =
      replyControls.newSince > 0 &&
      new Date(comment.created_at).getTime() > replyControls.newSince;

    return (
      <Box
        sx={{
          backgroundColor: theme.palette.customColors.primaryColor,
          border: `1px solid ${theme.palette.customColors.lineColor}`,
          borderRadius: 2,
          padding: 2.5,
          mx: 1,
          my: 0.5,
          ...(isNew
            ? {
                border: `1px solid rgba(${theme.palette.customColors.accentRgb}, 0.5)`,
              }
            : {}),
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <CommentAvatar
            username={comment.user.username}
            avatarUrl={comment.user.avatar?.url}
            size={40}
            fontSize="1rem"
            shadow="0 2px 8px rgba(0, 0, 0, 0.15)"
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 1,
                paddingBottom: 1,
                borderBottom: `1px solid rgba(${theme.palette.customColors.onSurfaceRgb}, 0.09)`,
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.customColors.primaryTextColor,
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                }}
              >
                {comment.user.username}
              </Typography>

              <Box
                sx={{
                  backgroundColor: `rgba(${theme.palette.customColors.onSurfaceRgb}, 0.06)`,
                  padding: '2px 8px',
                  borderRadius: 1,
                }}
              >
                <Typography
                  sx={{
                    color: theme.palette.customColors.accentTextColor,
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                  }}
                >
                  {CommentsManager.formatDate(comment.created_at)}
                </Typography>
              </Box>

              <VoteControls
                count={voteCount}
                tone={CommentsManager.getVoteTone(voteCount)}
                userVote={userVotes.get(comment.id)}
                disabled={isVoting}
                onVote={(vote) => onVote(comment.id, vote)}
                variant="full"
              />
            </Box>

            <Box
              sx={{
                color: theme.palette.customColors.primaryTextColor,
                fontSize: '0.9375rem',
                wordBreak: 'break-word',
                lineHeight: 1.7,
              }}
            >
              <CommentText html={comment.comment} />
            </Box>

            <CommentActions comment={comment} controls={replyControls} />

            {comment.replies && comment.replies.length > 0 && (
              <RepliesThread
                count={countReplies(comment.replies)}
                spacing={2}
                level={1}
                collapseFromLevel={replyControls.collapseFromLevel}
              >
                {comment.replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    comment={reply}
                    isVoting={isVoting}
                    onVote={onVote}
                    level={1}
                    userVotes={userVotes}
                    replyControls={replyControls}
                  />
                ))}
              </RepliesThread>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);

CommentItem.displayName = 'CommentItem';

export default CommentItem;
