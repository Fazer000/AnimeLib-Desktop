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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  TextField,
  Collapse,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  MoreHoriz,
  DeleteOutline,
  EditOutlined,
  LinkOutlined,
  PersonOffOutlined,
  ExpandMore,
} from '@mui/icons-material';
import { buildCommentUrl } from '../../utils/urlHelpers';
import { COMMENTS_LAST_SEEN_PREFIX } from '../../../constants';
import { CommentsManager, Comment } from '../../services/player';
import CommentText from './CommentText';
import { animeApi } from '../../api/animeApi';
import useImageWithReferer from '../../hooks/useImageWithReferer';
import CommentEditor, { CommentSubmitData } from './CommentEditor';

export interface ReplyControls {
  episodeId: number;
  animeSlug: string;
  onCopyLink: (commentId: number) => void;
  onIgnore: (userId: number | string, comment: string) => Promise<void>;
  collapseFromLevel: number;
  newSince: number;
  replyingTo: number | null;
  currentUserId: string | null;
  onReplyStart: (commentId: number) => void;
  onReplyCancel: () => void;
  onReplySubmit: (data: CommentSubmitData) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onEdit: (
    commentId: number,
    comment: { type: 'doc'; content: unknown[] },
  ) => Promise<void>;
}

const REPLY_LINK_SX = {
  color: '#a78bfa',
  fontSize: '0.8125rem',
  cursor: 'pointer',
  userSelect: 'none' as const,
  '&:hover': { textDecoration: 'underline' },
};

/**
 * Действия над комментарием и форма ответа
 */
const ReplyForm = memo(
  ({ comment, controls }: { comment: Comment; controls: ReplyControls }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const isOwn =
      controls.currentUserId != null &&
      comment.user?.id != null &&
      String(comment.user.id) === String(controls.currentUserId);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [ignoreOpen, setIgnoreOpen] = useState(false);
    const [ignoreNote, setIgnoreNote] = useState('');
    const [ignoreHintOpen, setIgnoreHintOpen] = useState(false);
    const [isIgnoring, setIsIgnoring] = useState(false);

    const handleIgnore = useCallback(async () => {
      if (!comment.user?.id) return;

      setIsIgnoring(true);
      try {
        await controls.onIgnore(comment.user.id, ignoreNote);
      } finally {
        setIsIgnoring(false);
        setIgnoreOpen(false);
      }
    }, [controls, comment.user, ignoreNote]);

    const handleEditSubmit = useCallback(
      async (data: CommentSubmitData) => {
        await controls.onEdit(comment.id, data.comment);
        setIsEditing(false);
      },
      [controls, comment.id],
    );

    const handleDelete = useCallback(async () => {
      setIsDeleting(true);
      try {
        await controls.onDelete(comment.id);
      } finally {
        setIsDeleting(false);
        setConfirmOpen(false);
      }
    }, [controls, comment.id]);

    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <Typography
            component="span"
            sx={REPLY_LINK_SX}
            onClick={() => controls.onReplyStart(comment.id)}
          >
            ответить
          </Typography>

          <IconButton
            size="small"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{ padding: '2px', color: 'rgba(255, 255, 255, 0.5)' }}
          >
            <MoreHoriz sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          {isOwn && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setIsEditing(true);
                controls.onReplyCancel();
              }}
              sx={{ gap: 1 }}
            >
              <EditOutlined sx={{ fontSize: 18 }} />
              Редактировать
            </MenuItem>
          )}
          {isOwn && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setConfirmOpen(true);
              }}
              sx={{ color: '#f87171', gap: 1 }}
            >
              <DeleteOutline sx={{ fontSize: 18 }} />
              Удалить
            </MenuItem>
          )}
          {!isOwn && comment.user?.id != null && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setIgnoreOpen(true);
              }}
              sx={{ gap: 1 }}
            >
              <PersonOffOutlined sx={{ fontSize: 18 }} />
              Добавить в игнор-лист
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              controls.onCopyLink(comment.id);
            }}
            sx={{ gap: 1 }}
          >
            <LinkOutlined sx={{ fontSize: 18 }} />
            Ссылка на комментарий
          </MenuItem>
        </Menu>

        <Dialog
          open={ignoreOpen}
          onClose={() => setIgnoreOpen(false)}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: '#1f1f24',
                backgroundImage: 'none',
                borderRadius: 2,
                minWidth: 420,
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '1.0625rem',
              fontWeight: 600,
              pb: 1,
            }}
          >
            Добавление в игнор-лист
          </DialogTitle>
          <DialogContent sx={{ pb: 1 }}>
            <Typography
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.8125rem',
                mb: 1,
              }}
            >
              Комментарий (необязательно)
            </Typography>
            <TextField
              value={ignoreNote}
              onChange={(event) => setIgnoreNote(event.target.value)}
              placeholder="Позволит вам помнить причину по которой вы добавили пользователя в игнор-лист"
              multiline
              minRows={3}
              fullWidth
              slotProps={{
                input: { sx: { color: 'rgba(255, 255, 255, 0.9)' } },
              }}
            />

            <Box
              onClick={() => setIgnoreHintOpen((open) => !open)}
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 1.5,
                cursor: 'pointer',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500 }}
              >
                Что позволяет игнор-лист?
              </Typography>
              <ExpandMore
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  transform: ignoreHintOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </Box>
            <Collapse in={ignoreHintOpen}>
              <Box
                component="ul"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  pl: 3,
                  mt: 1,
                }}
              >
                <li>Скрывает комментарии этого пользователя</li>
                <li>
                  Запрещает этому пользователю отвечать на ваши комментарии
                </li>
                <li>
                  Запрещает этому пользователю писать вам личные сообщения
                </li>
                <li>
                  Запрещает этому пользователю писать в вашей теме или отвечать
                  на ваши посты форума
                </li>
              </Box>
            </Collapse>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button
              onClick={() => setIgnoreOpen(false)}
              disabled={isIgnoring}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleIgnore}
              disabled={isIgnoring}
              variant="contained"
              sx={{ backgroundColor: '#b91c1c', fontWeight: 600 }}
            >
              {isIgnoring ? 'Добавление...' : 'Добавить в игнор'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: '#1f1f24',
                backgroundImage: 'none',
                borderRadius: 2,
                minWidth: 360,
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '1.0625rem',
              fontWeight: 600,
              pb: 1,
            }}
          >
            Подтвердите действие
          </DialogTitle>
          <DialogContent sx={{ pb: 1 }}>
            <DialogContentText
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9375rem',
              }}
            >
              Вы действительно хотите удалить комментарий?
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
              }}
            >
              Отменить
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              sx={{
                color: '#f87171',
                fontWeight: 600,
                '&:hover': { backgroundColor: 'rgba(248, 113, 113, 0.12)' },
              }}
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogActions>
        </Dialog>

        {isEditing && (
          <Box sx={{ mt: 1 }}>
            <CommentEditor
              episodeId={controls.episodeId}
              onSubmit={handleEditSubmit}
              initialContent={comment.comment}
              onCancel={() => setIsEditing(false)}
              submitLabel="Сохранить"
              autoFocus
            />
          </Box>
        )}

        {controls.replyingTo === comment.id && !isEditing && (
          <Box sx={{ mt: 1 }}>
            <CommentEditor
              episodeId={controls.episodeId}
              onSubmit={controls.onReplySubmit}
              parentComment={comment.id}
              rootId={comment.root_id ?? comment.id}
              commentLevel={(comment.comment_level ?? 0) + 1}
              onCancel={controls.onReplyCancel}
              placeholder="Написать ответ..."
              autoFocus
            />
          </Box>
        )}
      </>
    );
  },
);

ReplyForm.displayName = 'ReplyForm';

/**
 * Считает все вложенные ответы ветки
 */
function countReplies(comments: Comment[]): number {
  return comments.reduce(
    (total, comment) => total + 1 + countReplies(comment.replies || []),
    0,
  );
}

/**
 * Сворачиваемая ветка ответов: полоска слева служит переключателем
 */
const RepliesThread = memo(
  ({
    count,
    spacing,
    level,
    collapseFromLevel,
    children,
  }: {
    count: number;
    spacing: number;
    level: number;
    collapseFromLevel: number;
    children: React.ReactNode;
  }) => {
    const [collapsed, setCollapsed] = useState(level >= collapseFromLevel);
    const countLabel = count > 99 ? '99+' : String(count);

    return (
      <Box sx={{ display: 'flex', mt: spacing }}>
        <Box
          onClick={() => setCollapsed((current) => !current)}
          sx={{
            width: 20,
            flexShrink: 0,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: collapsed ? 'flex-start' : 'stretch',
            pt: collapsed ? 1 : 0,
            '&:hover .thread-rail-line': {
              borderColor: '#a78bfa',
            },
            '&:hover .thread-rail-pill': {
              backgroundColor: '#a78bfa',
              color: '#1f1f24',
            },
          }}
        >
          {collapsed ? (
            <Box
              key="thread-rail-pill"
              className="thread-rail-pill"
              sx={{
                width: countLabel.length > 2 ? 28 : 20,
                height: 20,
                flexShrink: 0,
                boxSizing: 'border-box',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              {countLabel}
            </Box>
          ) : (
            <Box
              key="thread-rail-line"
              className="thread-rail-line"
              sx={{
                width: 8,
                alignSelf: 'stretch',
                flexShrink: 0,
                boxSizing: 'border-box',
                borderLeft: '2px solid rgba(255, 255, 255, 0.08)',
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
                transition: 'border-color 0.15s ease',
              }}
            />
          )}
        </Box>

        {!collapsed && <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>}
      </Box>
    );
  },
);

RepliesThread.displayName = 'RepliesThread';

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
    replyControls,
  }: {
    comment: Comment;
    isVoting: boolean;
    onVote: (commentId: number, vote: 0 | 1) => void;
    level: number;
    userVotes: Map<number, 0 | 1>;
    replyControls: ReplyControls;
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
          ...(replyControls.newSince > 0 &&
          new Date(comment.created_at).getTime() > replyControls.newSince
            ? {
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                boxShadow: 'inset 2px 0 0 #7C3AED',
              }
            : {}),
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.5 }}>
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

            <ReplyForm comment={comment} controls={replyControls} />

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

/**
 * Single comment item - memoized for performance
 */
const CommentItem = memo(
  ({
    comment,
    isVoting,
    onVote,
    userVotes,
    replyControls,
  }: {
    comment: Comment;
    isVoting: boolean;
    onVote: (commentId: number, vote: 0 | 1) => void;
    userVotes: Map<number, 0 | 1>;
    replyControls: ReplyControls;
  }) => {
    const theme = useTheme();
    const voteCount = CommentsManager.getVoteCount(comment);
    const voteColor = CommentsManager.getVoteColor(voteCount);

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
          ...(replyControls.newSince > 0 &&
          new Date(comment.created_at).getTime() > replyControls.newSince
            ? { border: '1px solid rgba(124, 58, 237, 0.5)' }
            : {}),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
          }}
        >
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

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
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

            <ReplyForm comment={comment} controls={replyControls} />

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

interface CommentsProps {
  episodeId: number;
  animeSlug: string;
  sortOption: string;
  shouldLoad?: boolean;
  highlightNew: boolean;
  collapseFromLevel: number;
}

/**
 * Comments component with infinite scroll
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [displayCount, setDisplayCount] = useState<number>(20);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [votingComments, setVotingComments] = useState<Set<number>>(new Set());
  const [userVotes, setUserVotes] = useState<Map<number, 0 | 1>>(new Map());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const displayMoreRef = useRef<HTMLDivElement>(null);

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
        sortBy: 'id',
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

          if (oldVote !== undefined) {
            if (oldVote === 1) {
              upDelta -= 1;
            } else {
              downDelta -= 1;
            }
          }

          if (newVote !== null) {
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
      if (votingComments.has(commentId)) return;

      try {
        setVotingComments((prev) => new Set(prev).add(commentId));

        const currentVote = userVotes.get(commentId);

        const newVote = currentVote === vote ? null : vote;

        await animeApi.voteComment(commentId, vote);

        setUserVotes((prev) => {
          const next = new Map(prev);
          if (newVote === null) {
            next.delete(commentId);
          } else {
            next.set(commentId, newVote);
          }
          return next;
        });

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
        const result = await animeApi.submitComment(data);
        const created = result?.data?.data;
        console.log('[Comments] Comment submitted successfully');

        if (created?.id && created?.user) {
          commentsManager.insertComment(created);
          setDisplayCount((current) => Math.max(current, 20));
          return;
        }

        console.warn('[Comments] Incomplete response, reloading comments');
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

  const handleReplySubmit = useCallback(
    async (data: CommentSubmitData) => {
      await handleCommentSubmit(data);
      setReplyingTo(null);
    },
    [handleCommentSubmit],
  );

  const currentUserId = useMemo(() => animeApi.getCurrentUserId(), []);

  const newSince = useMemo(() => {
    if (!highlightNew) return 0;

    const key = `${COMMENTS_LAST_SEEN_PREFIX}${episodeId}`;
    const stored = Number(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, String(Date.now()));

    return stored;
  }, [episodeId, highlightNew]);

  const handleDelete = useCallback(
    async (commentId: number) => {
      try {
        const message = await animeApi.deleteComment(commentId);
        commentsManager.removeComment(commentId);
        setToast(message ?? 'Комментарий был удалён');
      } catch (error) {
        console.error('[Comments] Error deleting comment:', error);
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
        console.error('[Comments] Error updating comment:', error);
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
        console.error('[Comments] Error ignoring user:', error);
        setToast('Не удалось добавить в игнор-лист');
      }
    },
    [commentsManager],
  );

  const replyControls = useMemo(
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

  /**
   * Initial load - только если shouldLoad = true
   */
  useEffect(() => {
    if (!shouldLoad) {
      console.log('[Comments] shouldLoad is false, skipping initial load');
      return;
    }

    console.log('[Comments] shouldLoad is true, loading comments');
    const { sortBy, sortType } = getSortParams(sortOption);
    commentsManager.updateSortOptions(sortBy, sortType);
    commentsManager.reset();
    setComments([]);
    setDisplayCount(20);
    setHasMore(true);
    commentsManager.loadComments(episodeId, 1);
  }, [episodeId, commentsManager, shouldLoad, sortOption, getSortParams]);

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

  const visibleComments = comments.slice(0, displayCount);
  const hasMoreToDisplay = displayCount < comments.length;

  if (!shouldLoad) {
    return (
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
          Прокрутите вниз, чтобы загрузить комментарии
        </Typography>
      </Box>
    );
  }

  if (comments.length === 0 && !loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
