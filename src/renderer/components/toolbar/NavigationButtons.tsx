/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box } from '@mui/material';
import { ArrowBack, Refresh, Home, Search } from '@mui/icons-material';

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
 * - Refresh
 * - Home
 */
function NavigationButtons({
  onBack,
  onRefresh,
  onHome,
  onSearch,
  canGoBack = false,
}: NavigationButtonsProps) {
  const buttonStyle = {
    color: '#ffffff',
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
          <ArrowBack sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {onHome && (
        <IconButton size="small" onClick={onHome} sx={buttonStyle}>
          <Home sx={{ fontSize: 20 }} />
        </IconButton>
      )}
      {onRefresh && (
        <IconButton size="small" onClick={onRefresh} sx={buttonStyle}>
          <Refresh sx={{ fontSize: 20 }} />
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
