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

/**
 * Папка тайтла в закладках: кнопка с текущей папкой и меню переноса
 */
function BookmarkFolderButton({ state }: BookmarkFolderButtonProps) {
  const { customColors } = useTheme().palette;
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);

  const { folders, bookmark, loaded, busy, moveTo, remove, createFolder } =
    state;
  const current = bookmark
    ? (folders.find((folder) => folder.id === bookmark.status) ?? null)
    : null;

  let label = 'Добавить в планы';
  if (!loaded) label = 'Закладки';
  else if (bookmark) label = current?.name ?? 'В списке';

  const accent = current?.color || customColors.accentSoftColor;
  const baseSx = cardActionButtonSx(customColors);

  const notifyPopupClosed = useCardPopupClose();

  const close = () => {
    setOpen(false);
    notifyPopupClosed();
  };

  const handleMainClick = () => {
    if (bookmark) setOpen(true);
    else moveTo(BOOKMARK_STATUS_PLANNED);
  };

  const handleSelect = (status: number) => {
    close();
    if (status !== bookmark?.status) moveTo(status);
  };

  const handleRemove = () => {
    close();
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
      <Box ref={anchorRef} sx={{ display: 'inline-flex' }}>
        <Button
          disabled={!loaded || busy}
          onClick={handleMainClick}
          sx={{
            ...baseSx,
            borderRadius: '6px 0 0 6px',
            color: bookmark ? accent : customColors.primaryTextColor,
          }}
        >
          {busy ? <CircularProgress size={14} color="inherit" /> : <Bookmark />}
          {label}
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
        onClose={close}
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
