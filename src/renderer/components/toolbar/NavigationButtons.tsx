/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box, Tooltip, useTheme } from '@mui/material';
import { ArrowLeft, House, Moon, RotateCw, Search, Sun } from '../icons';
import useColorScheme from '../../hooks/useColorScheme';
import { themeModeStore } from '../../services/theme';

interface NavigationButtonsProps {
  onBack?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  onSearch?: () => void;
  canGoBack?: boolean;
}

/** Кнопки навигации для webview и плеера */
function NavigationButtons({
  onBack,
  onRefresh,
  onHome,
  onSearch,
  canGoBack = false,
}: NavigationButtonsProps) {
  const { customColors } = useTheme().palette;
  const scheme = useColorScheme();
  const buttonStyle = {
    color: customColors.dialogTextColor,
    WebkitAppRegion: 'no-drag' as const,
    appRegion: 'no-drag' as const,
    padding: 0.5,
    minWidth: 28,
    height: 28,
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {onBack && (
        <IconButton
          size="small"
          onClick={onBack}
          disabled={!canGoBack}
          sx={buttonStyle}
        >
          <ArrowLeft sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {onHome && (
        <IconButton size="small" onClick={onHome} sx={buttonStyle}>
          <House sx={{ fontSize: 20 }} />
        </IconButton>
      )}
      {onRefresh && (
        <IconButton size="small" onClick={onRefresh} sx={buttonStyle}>
          <RotateCw sx={{ fontSize: 20 }} />
        </IconButton>
      )}
      <Tooltip title={scheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} arrow>
        <IconButton
          size="small"
          onClick={() => themeModeStore.toggle()}
          aria-label="Сменить тему"
          sx={buttonStyle}
        >
          {scheme === 'dark' ? (
            <Sun sx={{ fontSize: 20 }} />
          ) : (
            <Moon sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      </Tooltip>
      {onSearch && (
        <IconButton size="small" onClick={onSearch} sx={buttonStyle}>
          <Search sx={{ fontSize: 20 }} />
        </IconButton>
      )}
    </Box>
  );
}

export default NavigationButtons;
