import { memo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { CommentsManager, Comment } from '../../../services/player';
import CommentText from '../CommentText';
import CommentActions from './CommentActions';
import CommentAvatar from './CommentAvatar';
import VoteControls from './VoteControls';
import RepliesThread, { countReplies } from './RepliesThread';
import type { ReplyControls } from './types';

interface ReplyItemProps {
  comment: Comment;
  isVoting: boolean;
  onVote: (commentId: number, vote: 0 | 1) => void;
  level: number;
  userVotes: Map<number, 0 | 1>;
  replyControls: ReplyControls;
}

/** Вложенный ответ: компактная версия карточки комментария. */
const ReplyItem = memo(
  ({
    comment,
    isVoting,
    onVote,
    level = 1,
    userVotes,
    replyControls,
  }: ReplyItemProps) => {
    const theme = useTheme();
    const voteCount = CommentsManager.getVoteCount(comment);
    const isNew =
      replyControls.newSince > 0 &&
      new Date(comment.created_at).getTime() > replyControls.newSince;

    return (
      <Box
        sx={{
          borderRadius: 2,
          py: 2,
          pl: 0.25,
          pr: 0,
          marginTop: 1,
          ...(isNew
            ? {
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                boxShadow: 'inset 2px 0 0 #7C3AED',
              }
            : {}),
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <CommentAvatar
            username={comment.user.username}
            avatarUrl={comment.user.avatar?.url}
            size={32}
            fontSize="0.875rem"
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
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

              <VoteControls
                count={voteCount}
                color={CommentsManager.getVoteColor(voteCount)}
                userVote={userVotes.get(comment.id)}
                disabled={isVoting}
                onVote={(vote) => onVote(comment.id, vote)}
                variant="compact"
              />
            </Box>

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

            <CommentActions comment={comment} controls={replyControls} />

            {comment.replies && comment.replies.length > 0 && (
              <RepliesThread
                count={countReplies(comment.replies)}
                spacing={1}
                level={level + 1}
                collapseFromLevel={replyControls.collapseFromLevel}
              >
                {comment.replies.map((reply) => (
                  <ReplyItem
                    key={reply.id}
                    comment={reply}
                    isVoting={isVoting}
                    onVote={onVote}
                    level={level + 1}
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

ReplyItem.displayName = 'ReplyItem';

export default ReplyItem;
