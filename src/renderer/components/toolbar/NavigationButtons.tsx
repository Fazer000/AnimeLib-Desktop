/* eslint-disable react/require-default-props */
import React from 'react';
import { IconButton, Box } from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Refresh,
  Home,
  Search,
} from '@mui/icons-material';

interface NavigationButtonsProps {
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  onSearch?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

/**
 * NavigationButtons - Navigation controls for webview/player
 *
 * Features:
 * - Back/Forward navigation
 * - Refresh
 * - Home
 */
function NavigationButtons({
  onBack,
  onForward,
  onRefresh,
  onHome,
  onSearch,
  canGoBack = false,
  canGoForward = false,
}: NavigationButtonsProps) {
  const buttonStyle = {
    color: '#ffffff',
    WebkitAppRegion: 'no-drag' as const,
    appRegion: 'no-drag' as const,
    padding: 0.5,
    minWidth: 24,
    height: 24,
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Back button */}
      {onBack && (
        <IconButton
          size="small"
          onClick={onBack}
          disabled={!canGoBack}
          sx={buttonStyle}
        >
          <ArrowBack sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Forward button */}
      {onForward && (
        <IconButton
          size="small"
          onClick={onForward}
          disabled={!canGoForward}
          sx={buttonStyle}
        >
          <ArrowForward sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      {/* Home button */}
      {onHome && (
        <IconButton size="small" onClick={onHome} sx={buttonStyle}>
          <Home sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      {/* Refresh button */}
      {onRefresh && (
        <IconButton size="small" onClick={onRefresh} sx={buttonStyle}>
          <Refresh sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      {/* Search button */}
      {onSearch && (
        <IconButton size="small" onClick={onSearch} sx={buttonStyle}>
          <Search sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
}

export default NavigationButtons;
