/* eslint-disable react/prop-types, react/require-default-props */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppBar, Toolbar, Box } from '@mui/material';
import NavigationButtons from './toolbar/NavigationButtons';
import UrlBar from './toolbar/UrlBar';
import WindowControls from './toolbar/WindowControls';
import AnimeInfoCard from './toolbar/AnimeInfoCard';
import AnimeInfoHandle from './toolbar/AnimeInfoHandle';
import SearchModal from './toolbar/SearchModal';
import { buildAnimePageUrl } from '../utils/urlHelpers';

import { createLogger } from '../../shared/logger';
import { SURFACE_HEADER } from '../theme/palette';

const log = createLogger('Toolbar');

const ANIME_INFO_HIDE_DELAY = 3000;

interface ToolbarProps {
  onBack?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;

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

  onPlayerButtonClick?: (url: string, animeId?: string) => void;

  onOpenAnimePage?: () => void;
  hideAnimeHandle?: boolean;
}

function ToolbarRefactored({
  onBack,
  onRefresh,
  onHome,
  canGoBack = false,

  currentUrl = '',

  showUrlInput = false,
  onUrlChange,
  onToggleUrlInput,

  onMinimize,
  onMaximize,
  onClose,

  backgroundColor = SURFACE_HEADER,
  height = 32,

  isPlayerPage = false,

  animeId,
  onPlayerButtonClick,

  onOpenAnimePage,
  hideAnimeHandle = false,
}: ToolbarProps) {
  const [showAnimeInfo, setShowAnimeInfo] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);

  const hideAnimeInfoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearHideAnimeInfoTimer = useCallback(() => {
    if (hideAnimeInfoTimerRef.current) {
      clearTimeout(hideAnimeInfoTimerRef.current);
      hideAnimeInfoTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearHideAnimeInfoTimer, [clearHideAnimeInfoTimer]);

  const handleShowAnimeInfo = () => {
    clearHideAnimeInfoTimer();
    // eslint-disable-next-line no-console
    log.debug('Show anime info, animeId:', animeId);
    if (animeId) {
      setShowAnimeInfo(true);
    }
  };

  const handleHideAnimeInfo = () => {
    clearHideAnimeInfoTimer();
    hideAnimeInfoTimerRef.current = setTimeout(() => {
      // eslint-disable-next-line no-console
      log.debug('Hide anime info');
      setShowAnimeInfo(false);
      hideAnimeInfoTimerRef.current = null;
    }, ANIME_INFO_HIDE_DELAY);
  };

  const handleOpenSearch = () => {
    // eslint-disable-next-line no-console
    log.debug('Opening search modal');
    setShowSearchModal(true);
  };

  const handleCloseSearch = () => {
    // eslint-disable-next-line no-console
    log.debug('Closing search modal');
    setShowSearchModal(false);
  };

  const handleAnimeSelect = (slugUrl: string, openInPlayer = false) => {
    // eslint-disable-next-line no-console
    log.debug(
      'Anime selected from search:',
      slugUrl,
      'openInPlayer:',
      openInPlayer,
    );

    const fullUrl = buildAnimePageUrl(slugUrl);

    // eslint-disable-next-line no-console
    log.debug('Navigating to:', fullUrl);

    if (openInPlayer) {
      if (!onPlayerButtonClick) {
        // eslint-disable-next-line no-console
        log.warn('onPlayerButtonClick not provided');
        return;
      }
      onPlayerButtonClick(fullUrl, slugUrl);
    } else if (onUrlChange) {
      // eslint-disable-next-line no-console
      log.debug('Navigating WebView to:', fullUrl);
      onUrlChange(fullUrl);
    } else {
      // eslint-disable-next-line no-console
      log.warn('onUrlChange not provided');
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
          <NavigationButtons
            onBack={onBack}
            onRefresh={onRefresh}
            onHome={onHome}
            onSearch={handleOpenSearch}
            canGoBack={canGoBack}
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
            right: 0,
            height: 190,
            zIndex: 999,
            margin: '0 auto',
            width: 480,
            pointerEvents: 'auto',
          }}
        >
          <AnimeInfoHandle hidden={showAnimeInfo || hideAnimeHandle} />
        </Box>
      )}

      {animeId && (
        <AnimeInfoCard
          animeId={animeId}
          isVisible={showAnimeInfo}
          onMouseEnter={handleShowAnimeInfo}
          onMouseLeave={handleHideAnimeInfo}
          onClick={onOpenAnimePage}
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
