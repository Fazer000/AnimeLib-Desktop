import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  useTheme,
} from '@mui/material';
import { Bookmark, Check, ChevronDown, Plus } from '../icons';
import { BOOKMARK_STATUS_PLANNED } from '../../../constants';
import type { AnimeBookmarkFolderState } from '../../hooks/useAnimeBookmarkFolder';
import { cardActionButtonSx } from './cardActionStyles';
import { useCardPopupClose } from './cardPopup';

interface BookmarkFolderButtonProps {
  state: AnimeBookmarkFolderState;
}

const ADD_TO_PLANS_LABEL = 'Добавить в планы';
const LOADING_LABEL = 'Закладки';
const IN_LIST_LABEL = 'В списке';

/**
 * Папка тайтла в закладках: кнопка с текущей папкой и меню переноса
 */
function BookmarkFolderButton({ state }: BookmarkFolderButtonProps) {
  const { customColors } = useTheme().palette;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const hideCardAfterExit = useRef(false);
  const [open, setOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  const { folders, bookmark, loaded, busy, moveTo, remove, createFolder } =
    state;
  const current = bookmark
    ? (folders.find((folder) => folder.id === bookmark.status) ?? null)
    : null;

  let label = ADD_TO_PLANS_LABEL;
  if (!loaded) label = LOADING_LABEL;
  else if (bookmark) label = current?.name ?? IN_LIST_LABEL;

  const sizingLabels = new Set([
    ADD_TO_PLANS_LABEL,
    LOADING_LABEL,
    IN_LIST_LABEL,
    ...folders.map((folder) => folder.name),
  ]);

  const accent = current?.color || customColors.accentSoftColor;
  const baseSx = cardActionButtonSx(customColors);

  const notifyPopupClosed = useCardPopupClose();

  const handleMenuExited = () => {
    notifyPopupClosed(hideCardAfterExit.current);
    hideCardAfterExit.current = false;
  };

  const handleMainClick = () => {
    if (bookmark) {
      setOpen(true);
    } else {
      moveTo(BOOKMARK_STATUS_PLANNED);
      notifyPopupClosed(true);
    }
  };

  const handleSelect = (status: number) => {
    setOpen(false);
    if (status !== bookmark?.status) {
      hideCardAfterExit.current = true;
      moveTo(status);
    }
  };

  const handleRemove = () => {
    hideCardAfterExit.current = true;
    setOpen(false);
    remove();
  };

  const submitFolder = async () => {
    const name = newName.trim();
    if (!name || creating) return;

    setCreating(true);
    if (await createFolder(name)) setNewName('');
    setCreating(false);
  };

  return (
    <>
      <Box ref={anchorRef} sx={{ display: 'inline-flex', minWidth: 0 }}>
        <Button
          disabled={!loaded || busy}
          onClick={handleMainClick}
          sx={{
            ...baseSx,
            borderRadius: '6px 0 0 6px',
            color: bookmark ? accent : customColors.primaryTextColor,
            justifyContent: 'flex-start',
          }}
        >
          <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
            {busy ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Bookmark />
            )}
          </Box>
          <Box
            component="span"
            sx={{
              display: 'inline-grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              minWidth: 0,
              '& > span': {
                gridArea: '1 / 1',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
              },
              '& > [aria-hidden]': { visibility: 'hidden' },
            }}
          >
            <span>{label}</span>
            {Array.from(sizingLabels, (name) => (
              <span key={name} aria-hidden="true">
                {name}
              </span>
            ))}
          </Box>
        </Button>
        <Button
          aria-label="Выбрать папку"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!loaded || busy}
          onClick={() => setOpen(true)}
          sx={{
            ...baseSx,
            px: 0.75,
            flexShrink: 0,
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
          }}
        >
          <ChevronDown />
        </Button>
      </Box>

      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        onTransitionExited={handleMenuExited}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.75, minWidth: 220 } } }}
      >
        {folders.map((folder) => {
          const selected = folder.id === bookmark?.status;

          return (
            <MenuItem
              key={folder.id}
              selected={selected}
              onClick={() => handleSelect(folder.id)}
              sx={{ gap: 1, justifyContent: 'space-between' }}
            >
              {folder.name}
              {selected && (
                <Check
                  sx={{ fontSize: 16, color: customColors.accentSoftColor }}
                />
              )}
            </MenuItem>
          );
        })}

        {bookmark && (
          <MenuItem
            onClick={handleRemove}
            sx={{ color: customColors.dangerColor }}
          >
            Удалить из списка
          </MenuItem>
        )}

        <Divider sx={{ borderColor: customColors.lineColor }} />

        <Box
          onKeyDown={(event) => {
            if (event.key !== 'Escape') event.stopPropagation();
          }}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 2, pr: 1 }}
        >
          <InputBase
            value={newName}
            placeholder="Создать новую папку"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitFolder();
            }}
            inputProps={{ 'aria-label': 'Название новой папки', maxLength: 64 }}
            sx={{
              flex: 1,
              fontSize: '0.875rem',
              color: customColors.primaryTextColor,
            }}
          />
          <IconButton
            aria-label="Создать папку"
            size="small"
            disabled={!newName.trim() || creating}
            onClick={submitFolder}
            sx={{ color: customColors.accentSoftColor }}
          >
            {creating ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Plus sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Box>
      </Menu>
    </>
  );
}

export default BookmarkFolderButton;
