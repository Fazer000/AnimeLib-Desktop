/* eslint-disable no-console */
import React, { useState, useCallback, useMemo, memo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Box,
  IconButton,
  Tooltip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatStrikethrough,
  FormatQuote,
  Visibility,
  Send,
} from '@mui/icons-material';
import { SpoilerInline } from './tiptap/SpoilerInline';
import './CommentEditor.css';

export interface CommentSubmitData {
  comment: {
    type: 'doc';
    content: unknown[];
  };
  post_type: 'episodes';
  post_id: number;
  parent_comment: number | null;
  root_id: number | null;
  comment_level: number;
}

interface CommentEditorProps {
  episodeId: number;
  onSubmit: (data: CommentSubmitData) => Promise<void>;
  // eslint-disable-next-line react/require-default-props
  parentComment?: number | null;
  // eslint-disable-next-line react/require-default-props
  rootId?: number | null;
  // eslint-disable-next-line react/require-default-props
  commentLevel?: number;
}

interface MenuButtonProps {
  onClick: () => void;
  active: boolean;
  tooltip: string;
  children: React.ReactNode;
}

const MenuButton = memo(
  ({ onClick, active, tooltip, children }: MenuButtonProps) => {
    const theme = useTheme();

    return (
      <Tooltip title={tooltip}>
        <IconButton
          onClick={onClick}
          size="small"
          sx={{
            color: active
              ? theme.palette.customColors.dtSecondaryColor
              : theme.palette.customColors.dtAccentTextColor,
            backgroundColor: active
              ? 'rgba(255, 255, 255, 0.1)'
              : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
          }}
        >
          {children}
        </IconButton>
      </Tooltip>
    );
  },
);

function CommentEditorComponent({
  episodeId,
  onSubmit,
  parentComment = null,
  rootId = null,
  commentLevel = 0,
}: CommentEditorProps) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spoilerDialogOpen, setSpoilerDialogOpen] = useState(false);
  const [spoilerTitle, setSpoilerTitle] = useState('');
  const [editingSpoilerId, setEditingSpoilerId] = useState<string | null>(null);

  // Мемоизируем конфигурацию расширений
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      SpoilerInline,
      Placeholder.configure({
        placeholder: 'Написать комментарий...',
      }),
    ],
    [],
  );

  // Мемоизируем editorProps
  const editorProps = useMemo(
    () => ({
      attributes: {
        class: 'comment-editor-content',
        style: `
          outline: none;
          min-height: 80px;
          max-height: 300px;
          overflow-y: auto;
          padding: 12px;
          color: ${theme.palette.customColors.dtPrimaryTextColor};
        `,
      },
      handleClick: (view: any, pos: any, event: any) => {
        const target = event.target as HTMLElement;
        const spoilerElement = target.closest('.spoiler-inline');

        if (spoilerElement) {
          event.preventDefault();
          event.stopPropagation();

          const visibleText =
            spoilerElement.getAttribute('data-visible-text') || 'спойлер';
          setSpoilerTitle(visibleText);
          setEditingSpoilerId(
            spoilerElement.getAttribute('data-spoiler-id') || 'default',
          );
          setSpoilerDialogOpen(true);

          return true;
        }

        return false;
      },
    }),
    [theme.palette.customColors.dtPrimaryTextColor],
  );

  // Создаем редактор
  const editor = useEditor({
    extensions,
    editorProps,
    shouldRerenderOnTransaction: false,
  });

  const handleSpoilerSubmit = useCallback(() => {
    if (editor && editingSpoilerId) {
      const title = spoilerTitle.trim() || 'спойлер';

      // Находим и обновляем атрибут visibleText у конкретного спойлера
      const { state, view } = editor;
      const { tr } = state;

      state.doc.descendants((node, pos) => {
        if (
          node.type.name === 'spoilerInline' &&
          node.attrs.spoilerId === editingSpoilerId
        ) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            visibleText: title,
          });
        }
      });

      view.dispatch(tr);
    }
    setSpoilerDialogOpen(false);
    setSpoilerTitle('');
    setEditingSpoilerId(null);
  }, [editor, spoilerTitle, editingSpoilerId]);

  const handleSubmit = useCallback(async () => {
    if (!editor) return;

    const json = editor.getJSON();

    // Check if editor is empty
    if (!json.content || json.content.length === 0) {
      return;
    }

    // Check if only empty paragraphs
    const isEmpty = json.content.every(
      (node) =>
        node.type === 'paragraph' &&
        (!node.content || node.content.length === 0),
    );

    if (isEmpty) {
      return;
    }

    const data: CommentSubmitData = {
      comment: {
        type: 'doc',
        content: json.content || [],
      },
      post_type: 'episodes',
      post_id: episodeId,
      parent_comment: parentComment,
      root_id: rootId,
      comment_level: commentLevel,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      editor.commands.clearContent();
    } catch (error) {
      console.error('[CommentEditor] Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editor, episodeId, onSubmit, parentComment, rootId, commentLevel]);

  if (!editor) {
    return null;
  }

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.customColors.dtPrimaryColor,
        borderRadius: 2,
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
        mx: 1,
        mb: 2.5,
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          padding: 1,
          borderBottom: `1px solid ${theme.palette.customColors.dtBorderColor}15`,
          flexWrap: 'wrap',
        }}
      >
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          tooltip="Жирный (Ctrl+B)"
        >
          <FormatBold fontSize="small" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          tooltip="Курсив (Ctrl+I)"
        >
          <FormatItalic fontSize="small" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          tooltip="Подчеркнутый (Ctrl+U)"
        >
          <FormatUnderlined fontSize="small" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          tooltip="Зачеркнутый"
        >
          <FormatStrikethrough fontSize="small" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          tooltip="Цитата"
        >
          <FormatQuote fontSize="small" />
        </MenuButton>

        <MenuButton
          onClick={() => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to);
            if (text.trim()) {
              // Создаем спойлер с названием по умолчанию
              editor.chain().focus().insertSpoilerInline('спойлер', text).run();
            }
          }}
          active={editor.isActive('spoilerInline')}
          tooltip="Спойлер (выделите текст и нажмите)"
        >
          <Visibility fontSize="small" />
        </MenuButton>
      </Box>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Submit Button */}
      <Box
        sx={{
          padding: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: `1px solid ${theme.palette.customColors.dtBorderColor}15`,
        }}
      >
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={<Send />}
          sx={{
            backgroundColor: theme.palette.customColors.dtSecondaryColor,
            color: theme.palette.customColors.dtPrimaryTextColor,
            '&:hover': {
              backgroundColor: theme.palette.customColors.dtSecondaryColor,
              opacity: 0.8,
            },
            '&:disabled': {
              backgroundColor: theme.palette.customColors.dtBorderColor,
              color: theme.palette.customColors.dtAccentTextColor,
            },
          }}
        >
          {isSubmitting ? 'Отправка...' : 'Отправить'}
        </Button>
      </Box>

      {/* Spoiler Dialog */}
      <Dialog
        open={spoilerDialogOpen}
        onClose={() => {
          setSpoilerDialogOpen(false);
          setSpoilerTitle('');
          setEditingSpoilerId(null);
        }}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.customColors.dtPrimaryColor,
            color: theme.palette.customColors.dtPrimaryTextColor,
          },
        }}
      >
        <DialogTitle
          sx={{
            color: theme.palette.customColors.dtPrimaryTextColor,
            borderBottom: `1px solid ${theme.palette.customColors.dtBorderColor}15`,
          }}
        >
          Название спойлера
        </DialogTitle>
        <DialogContent sx={{ paddingTop: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Название"
            type="text"
            fullWidth
            value={spoilerTitle}
            onChange={(e) => setSpoilerTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSpoilerSubmit();
              }
            }}
            placeholder="спойлер"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: theme.palette.customColors.dtPrimaryTextColor,
                '& fieldset': {
                  borderColor: theme.palette.customColors.dtBorderColor,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.customColors.dtSecondaryColor,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.customColors.dtSecondaryColor,
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.customColors.dtAccentTextColor,
                '&.Mui-focused': {
                  color: theme.palette.customColors.dtSecondaryColor,
                },
              },
              '& .MuiInputBase-input::placeholder': {
                color: theme.palette.customColors.dtAccentTextColor,
                opacity: 0.7,
              },
            }}
          />
        </DialogContent>
        <DialogActions
          sx={{
            padding: 2,
            borderTop: `1px solid ${theme.palette.customColors.dtBorderColor}15`,
          }}
        >
          <Button
            onClick={() => {
              setSpoilerDialogOpen(false);
              setSpoilerTitle('');
              setEditingSpoilerId(null);
            }}
            sx={{
              color: theme.palette.customColors.dtAccentTextColor,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSpoilerSubmit}
            variant="contained"
            sx={{
              backgroundColor: theme.palette.customColors.dtSecondaryColor,
              color: theme.palette.customColors.dtPrimaryTextColor,
              '&:hover': {
                backgroundColor: theme.palette.customColors.dtSecondaryColor,
              },
            }}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const CommentEditor = memo(CommentEditorComponent);

MenuButton.displayName = 'MenuButton';
CommentEditor.displayName = 'CommentEditor';

export default CommentEditor;
