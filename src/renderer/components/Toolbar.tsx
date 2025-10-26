/* eslint-disable react/prop-types, react/require-default-props */
import React, { useState } from 'react';
import { AppBar, Toolbar, Box } from '@mui/material';
import NavigationButtons from './toolbar/NavigationButtons';
import UrlBar from './toolbar/UrlBar';
import WindowControls from './toolbar/WindowControls';
import AnimeInfoCard from './toolbar/AnimeInfoCard';
import SearchModal from './toolbar/SearchModal';

/**
 * Props for Toolbar component
 */
interface ToolbarProps {
  // Navigation
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;

  // Display
  currentUrl?: string;

  // URL Input
  showUrlInput?: boolean;
  onUrlChange?: (url: string) => void;
  onToggleUrlInput?: () => void;

  // Window Controls
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;

  // Styling
  backgroundColor?: string;
  height?: number;

  // Page State
  isPlayerPage?: boolean;

  // Anime Info
  animeId?: string;

  // Search Navigation
  onPlayerButtonClick?: (url: string, animeId?: string) => void;
}

/**
 * Toolbar - Custom window toolbar with drag support
 *
 * @description
 * Modular toolbar component with Material Design styling.
 * Supports drag-to-move window functionality and contains:
 * - Navigation buttons (back, forward, refresh, home, play/pause)
 * - URL bar with toggle between display and input modes
 * - Window controls (minimize, maximize, close)
 *
 * @component
 * @example
 * ```tsx
 * <Toolbar
 *   onBack={handleBack}
 *   canGoBack={true}
 *   title="Episode 7"
 *   currentUrl="https://example.com"
 *   selectedPlayer={player}
 *   onMinimize={minimize}
 *   onMaximize={maximize}
 *   onClose={close}
 * />
 * ```
 */
function ToolbarRefactored({
  // Navigation
  onBack,
  onForward,
  onRefresh,
  onHome,
  canGoBack = false,
  canGoForward = false,

  // Display
  currentUrl = '',

  // URL Input
  showUrlInput = false,
  onUrlChange,
  onToggleUrlInput,

  // Window Controls
  onMinimize,
  onMaximize,
  onClose,

  // Styling
  backgroundColor = '#252527',
  height = 32,

  // Page State
  isPlayerPage = false,

  // Anime Info
  animeId,

  // Search Navigation
  onPlayerButtonClick,
}: ToolbarProps) {
  const [showAnimeInfo, setShowAnimeInfo] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  const handleShowAnimeInfo = () => {
    // eslint-disable-next-line no-console
    console.log('[Toolbar] Show anime info, animeId:', animeId);
    if (animeId) {
      setShowAnimeInfo(true);
    }
  };

  const handleHideAnimeInfo = () => {
    // eslint-disable-next-line no-console
    console.log('[Toolbar] Hide anime info');
    setShowAnimeInfo(false);
  };

  const handleOpenSearch = () => {
    // eslint-disable-next-line no-console
    console.log('[Toolbar] Opening search modal');
    setShowSearchModal(true);
  };

  const handleCloseSearch = () => {
    // eslint-disable-next-line no-console
    console.log('[Toolbar] Closing search modal');
    setShowSearchModal(false);
  };

  const handleAnimeSelect = (slugUrl: string, openInPlayer = false) => {
    // eslint-disable-next-line no-console
    console.log(
      '[Toolbar] Anime selected from search:',
      slugUrl,
      'openInPlayer:',
      openInPlayer,
    );

    // Получаем базовый URL из localStorage и убираем лишний слеш на конце
    let baseUrl =
      localStorage.getItem('animeLibUrl') || 'https://v3.animelib.org';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Формируем полный URL для аниме
    const fullUrl = `${baseUrl}/ru/anime/${slugUrl}`;

    // eslint-disable-next-line no-console
    console.log('[Toolbar] Navigating to:', fullUrl);

    // Если нужно открыть в плеере, вызываем onPlayerButtonClick
    if (openInPlayer) {
      if (!onPlayerButtonClick) {
        // eslint-disable-next-line no-console
        console.warn('[Toolbar] onPlayerButtonClick not provided');
        return;
      }
      onPlayerButtonClick(fullUrl, slugUrl);
    } else if (onUrlChange) {
      // Если в WebView, используем onUrlChange для навигации
      // eslint-disable-next-line no-console
      console.log('[Toolbar] Navigating WebView to:', fullUrl);
      onUrlChange(fullUrl);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[Toolbar] onUrlChange not provided');
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          backgroundColor: `${backgroundColor} !important`,
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
          borderRadius: isPlayerPage ? '0 0 16px 16px' : '0',
          minHeight: height,
          height,
          boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.4)',
          border: 'none !important',
          '--Paper-shadow': 'none !important',
          '--Paper-overlay': 'none !important',
          '&.MuiAppBar-root': {
            backgroundColor: `${backgroundColor} !important`,
            boxShadow: 'none !important',
            border: 'none !important',
            '--Paper-shadow': 'none !important',
            '--Paper-overlay': 'none !important',
          },
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${height}px !important`,
            height: `${height}px !important`,
            paddingLeft: 1,
            paddingRight: 1,
            gap: 1,
          }}
        >
          {/* Left Section: Navigation */}
          <NavigationButtons
            onBack={onBack}
            onForward={onForward}
            onRefresh={onRefresh}
            onHome={onHome}
            onSearch={handleOpenSearch}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
          />

          {/* Center Section: URL Bar - Hide on player page */}
          {!isPlayerPage && (
            <UrlBar
              currentUrl={currentUrl}
              showUrlInput={showUrlInput}
              onUrlChange={onUrlChange}
              onToggleUrlInput={onToggleUrlInput}
            />
          )}

          {/* Spacer for player page */}
          {isPlayerPage && <Box sx={{ flex: 1 }} />}

          {/* Right Section: Window Controls */}
          <WindowControls
            onMinimize={onMinimize}
            onMaximize={onMaximize}
            onClose={onClose}
          />
        </Toolbar>
      </AppBar>

      {/* Invisible Hover Zone */}
      {animeId && (
        <Box
          onMouseEnter={handleShowAnimeInfo}
          onMouseLeave={handleHideAnimeInfo}
          sx={{
            position: 'fixed',
            top: 32,
            left: 0,
            right: 0,
            height: 30,
            zIndex: 999,
            margin: '0 auto',
            width: '60%',
            pointerEvents: 'auto',
            // backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug
          }}
        />
      )}

      {/* Anime Info Card */}
      {animeId && (
        <AnimeInfoCard
          animeId={animeId}
          isVisible={showAnimeInfo}
          onMouseEnter={handleShowAnimeInfo}
          onMouseLeave={handleHideAnimeInfo}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        open={showSearchModal}
        onClose={handleCloseSearch}
        onAnimeSelect={handleAnimeSelect}
      />
    </>
  );
}

export default ToolbarRefactored;
