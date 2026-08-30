import { memo, useCallback, useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import {
  DeleteOutline,
  EditOutlined,
  LinkOutlined,
  MoreHoriz,
  PersonOffOutlined,
} from '@mui/icons-material';
import { Comment } from '../../../services/player';
import CommentEditor, { CommentSubmitData } from '../CommentEditor';
import { DeleteCommentDialog, IgnoreUserDialog } from './dialogs';
import type { ReplyControls } from './types';
import { ACCENT_SOFT, DANGER_SOFT } from '../../../theme/palette';

const REPLY_LINK_SX = {
  color: ACCENT_SOFT,
  fontSize: '0.8125rem',
  cursor: 'pointer',
  userSelect: 'none' as const,
  '&:hover': { textDecoration: 'underline' },
};

/** Ссылка «ответить», меню действий и формы редактирования и ответа. */
const CommentActions = memo(
  ({ comment, controls }: { comment: Comment; controls: ReplyControls }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [ignoreOpen, setIgnoreOpen] = useState(false);
    const [ignoreNote, setIgnoreNote] = useState('');
    const [isIgnoring, setIsIgnoring] = useState(false);

    const isOwn =
      controls.currentUserId != null &&
      comment.user?.id != null &&
      String(comment.user.id) === String(controls.currentUserId);

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
              sx={{ color: DANGER_SOFT, gap: 1 }}
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

        <IgnoreUserDialog
          open={ignoreOpen}
          note={ignoreNote}
          isSubmitting={isIgnoring}
          onNoteChange={setIgnoreNote}
          onClose={() => setIgnoreOpen(false)}
          onConfirm={handleIgnore}
        />

        <DeleteCommentDialog
          open={confirmOpen}
          isDeleting={isDeleting}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleDelete}
        />

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

CommentActions.displayName = 'CommentActions';

export default CommentActions;
