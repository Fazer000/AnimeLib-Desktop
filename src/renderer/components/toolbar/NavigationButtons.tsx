/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box, useTheme } from '@mui/material';
import { ArrowLeft, House, RotateCw, Search } from '../icons';

interface NavigationButtonsProps {
  onBack?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  onSearch?: () => void;
  canGoBack?: boolean;
}

/**
 * NavigationButtons - Navigation controls for webview/player
 *
 * Features:
 * - Back navigation
 * - RotateCw
 * - House
 */
function NavigationButtons({
  onBack,
  onRefresh,
  onHome,
  onSearch,
  canGoBack = false,
}: NavigationButtonsProps) {
  const { customColors } = useTheme().palette;
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
      {onSearch && (
        <IconButton size="small" onClick={onSearch} sx={buttonStyle}>
          <Search sx={{ fontSize: 20 }} />
        </IconButton>
      )}
    </Box>
  );
}

export default NavigationButtons;
