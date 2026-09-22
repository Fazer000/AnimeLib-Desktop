import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, InputBase, useTheme } from '@mui/material';
import { Search } from '../icons';
import { Episode } from '../../api/animeApi';
import { findEpisodeIndex } from '../../utils/episodeLookup';
import {
  EPISODE_CHIP_MARGIN_BOTTOM,
  EPISODE_CHIP_MARGIN_TOP,
  EPISODE_JUMP_INPUT_WIDTH,
  EPISODE_SLIDER_BUTTON_SIZE,
} from '../../../constants';

interface EpisodeJumpFieldProps {
  episodes: Episode[];
  onPreview: (index: number | null) => void;
  onSelect: (index: number) => void;
}

/**
 * Переход к серии по номеру: кнопка с лупой раскрывает поле, сдвигая ленту
 */
function EpisodeJumpField({
  episodes,
  onPreview,
  onSelect,
}: EpisodeJumpFieldProps) {
  const { customColors } = useTheme().palette;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectingRef = useRef<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');

  const numbers = episodes.map((episode) => episode.number);
  const index = findEpisodeIndex(numbers, query);
  const invalid = query.trim() !== '' && index < 0;

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
    onPreview(null);
    inputRef.current?.blur();
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }

    setOpen(true);
  };

  const handleChange = (value: string) => {
    setQuery(value);

    const found = findEpisodeIndex(numbers, value);
    onPreview(found >= 0 ? found : null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && index >= 0) {
      selectingRef.current = true;
      onSelect(index);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      selectingRef.current = false;
    }

    if (event.key === 'Escape') {
      close();
    }
  };

  const idleBorder = invalid
    ? customColors.dangerColor
    : customColors.lineColor;
  const focusBorder = invalid
    ? customColors.dangerColor
    : customColors.accentSoftColor;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <IconButton
        aria-label="Перейти к серии"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggle}
        sx={{
          flexShrink: 0,
          width: EPISODE_SLIDER_BUTTON_SIZE,
          height: EPISODE_SLIDER_BUTTON_SIZE,
          mt: EPISODE_CHIP_MARGIN_TOP,
          mb: EPISODE_CHIP_MARGIN_BOTTOM,
          borderRadius: '6px',
          color: customColors.accentSoftColor,
          backgroundColor: `rgba(${customColors.accentRgb}, ${open ? 0.42 : 0.28})`,
          transition: 'background-color 0.15s ease',
          '&:hover': {
            backgroundColor: `rgba(${customColors.accentRgb}, 0.42)`,
          },
        }}
      >
        <Search sx={{ fontSize: 18 }} />
      </IconButton>

      <InputBase
        inputRef={inputRef}
        value={query}
        placeholder="№"
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!selectingRef.current) close();
        }}
        slotProps={{
          input: {
            'aria-label': 'Номер серии',
            inputMode: 'decimal',
            tabIndex: open ? 0 : -1,
          },
        }}
        sx={{
          width: open ? EPISODE_JUMP_INPUT_WIDTH : 0,
          ml: open ? 1 : 0,
          height: 32,
          mt: EPISODE_CHIP_MARGIN_TOP,
          mb: EPISODE_CHIP_MARGIN_BOTTOM,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          boxSizing: 'border-box',
          border: open ? `1px solid ${idleBorder}` : 'none',
          borderRadius: '6px',
          backgroundColor: customColors.primaryColor,
          color: customColors.primaryTextColor,
          fontSize: '0.875rem',
          transition:
            'width 0.2s ease, margin 0.2s ease, opacity 0.2s ease, border-color 0.15s ease',
          '&.Mui-focused': {
            borderColor: focusBorder,
          },
          '& input': {
            textAlign: 'center',
            padding: 0,
          },
        }}
      />
    </Box>
  );
}

export default EpisodeJumpField;
