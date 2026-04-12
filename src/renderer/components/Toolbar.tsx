/* eslint-disable react/prop-types, react/require-default-props */
import React, { useState } from 'react';
import { AppBar, Toolbar, Box } from '@mui/material';
import NavigationButtons from './toolbar/NavigationButtons';
import UrlBar from './toolbar/UrlBar';
import WindowControls from './toolbar/WindowControls';
import AnimeInfoCard from './toolbar/AnimeInfoCard';
import SearchModal from './toolbar/SearchModal';

interface ToolbarProps {
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;

  currentUrl?: string;

  showUrlInput?: boolean;
  onUrlChange?: (url: string) => void;
  onToggleUrlInput?: () => void;

  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;

  backgroundColor?: string;
  height?: number;

  isPlayerPage?: boolean;

  animeId?: string;

  sidebarCollapsed?: boolean;

  onPlayerButtonClick?: (url: string, animeId?: string) => void;
}

function ToolbarRefactored({
  onBack,
  onForward,
  onRefresh,
  onHome,
  canGoBack = false,
  canGoForward = false,

  currentUrl = '',

  showUrlInput = false,
  onUrlChange,
  onToggleUrlInput,

  onMinimize,
  onMaximize,
  onClose,

  backgroundColor = '#252527',
  height = 32,

  isPlayerPage = false,

  animeId,

  sidebarCollapsed = false,

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

    let baseUrl =
      localStorage.getItem('animeLibUrl') || 'https://v3.animelib.org';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    const fullUrl = `${baseUrl}/ru/anime/${slugUrl}`;

    // eslint-disable-next-line no-console
    console.log('[Toolbar] Navigating to:', fullUrl);

    if (openInPlayer) {
      if (!onPlayerButtonClick) {
        // eslint-disable-next-line no-console
        console.warn('[Toolbar] onPlayerButtonClick not provided');
        return;
      }
      onPlayerButtonClick(fullUrl, slugUrl);
    } else if (onUrlChange) {
      // eslint-disable-next-line no-console
      console.log('[Toolbar] Navigating WebView to:', fullUrl);
      onUrlChange(fullUrl);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[Toolbar] onUrlChange not provided');
    }
  };

  const sidebarWidth = sidebarCollapsed ? 0 : 260;

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
          <NavigationButtons
            onBack={onBack}
            onForward={onForward}
            onRefresh={onRefresh}
            onHome={onHome}
            onSearch={handleOpenSearch}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
          />

          {!isPlayerPage && (
            <UrlBar
              currentUrl={currentUrl}
              showUrlInput={showUrlInput}
              onUrlChange={onUrlChange}
              onToggleUrlInput={onToggleUrlInput}
            />
          )}

          {isPlayerPage && <Box sx={{ flex: 1 }} />}

          <WindowControls
            onMinimize={onMinimize}
            onMaximize={onMaximize}
            onClose={onClose}
          />
        </Toolbar>
      </AppBar>

      {animeId && (
        <Box
          onMouseEnter={handleShowAnimeInfo}
          onMouseLeave={handleHideAnimeInfo}
          sx={{
            position: 'fixed',
            top: 32,
            left: 0,
            right: sidebarWidth,
            height: 30,
            zIndex: 999,
            margin: '0 auto',
            width: '60%',
            pointerEvents: 'auto',
          }}
        />
      )}

      {animeId && (
        <AnimeInfoCard
          animeId={animeId}
          isVisible={showAnimeInfo}
          onMouseEnter={handleShowAnimeInfo}
          onMouseLeave={handleHideAnimeInfo}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}

      <SearchModal
        open={showSearchModal}
        onClose={handleCloseSearch}
        onAnimeSelect={handleAnimeSelect}
      />
    </>
  );
}

export default ToolbarRefactored;
