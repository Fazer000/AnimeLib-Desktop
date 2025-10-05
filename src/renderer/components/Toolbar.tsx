/* eslint-disable react/prop-types, react/require-default-props */
import React, { useState } from 'react';
import { AppBar, Toolbar, Box } from '@mui/material';
import NavigationButtons from './toolbar/NavigationButtons';
import UrlBar from './toolbar/UrlBar';
import WindowControls from './toolbar/WindowControls';
import AnimeInfoCard from './toolbar/AnimeInfoCard';

/**
 * Props for Toolbar component
 */
interface ToolbarProps {
  // ==================== Navigation ====================
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  onHome?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;

  // ==================== Display ====================
  title?: string;
  currentUrl?: string;
  selectedPlayer?: {
    id: number;
    player: string;
    team: {
      name: string;
    };
  } | null;

  // ==================== URL Input ====================
  showUrlInput?: boolean;
  onUrlChange?: (url: string) => void;
  onToggleUrlInput?: () => void;

  // ==================== Player Controls ====================
  showPlayButton?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;

  // ==================== Window Controls ====================
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;

  // ==================== Styling ====================
  backgroundColor?: string;
  height?: number;

  // ==================== Anime Info ====================
  animeId?: string;
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
  // Navigation props
  onBack,
  onForward,
  onRefresh,
  onHome,
  canGoBack = false,
  canGoForward = false,

  // Display props
  title,
  currentUrl = '',
  selectedPlayer,

  // URL input props
  showUrlInput = false,
  onUrlChange,
  onToggleUrlInput,

  // Player control props
  showPlayButton = false,
  isPlaying = false,
  onPlayPause,

  // Window control props
  onMinimize,
  onMaximize,
  onClose,

  // Styling props
  backgroundColor = '#252527',
  height = 32,

  // Anime info props
  animeId,
}: ToolbarProps) {
  const [showAnimeInfo, setShowAnimeInfo] = useState<boolean>(false);

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

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: `${backgroundColor} !important`,
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
          borderRadius: selectedPlayer ? '0 0 16px 16px' : '0',
          minHeight: height,
          height,
          boxShadow: 'none !important',
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
            paddingLeft: '8px',
            paddingRight: '8px',
            gap: 0.5,
          }}
        >
          {/* ==================== Left Section: Navigation ==================== */}
          <NavigationButtons
            onBack={onBack}
            onForward={onForward}
            onRefresh={onRefresh}
            onHome={onHome}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            showPlayButton={showPlayButton}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
          />

          {/* ==================== Center Section: URL Bar ==================== */}
          <UrlBar
            title={title}
            currentUrl={currentUrl}
            showUrlInput={showUrlInput}
            onUrlChange={onUrlChange}
            onToggleUrlInput={onToggleUrlInput}
            selectedPlayer={selectedPlayer}
          />

          {/* ==================== Right Section: Window Controls ==================== */}
          <WindowControls
            onMinimize={onMinimize}
            onMaximize={onMaximize}
            onClose={onClose}
          />
        </Toolbar>
      </AppBar>

      {/* ==================== Invisible Hover Zone ==================== */}
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
            // backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug: uncomment to see zone
          }}
        />
      )}

      {/* ==================== Anime Info Card ==================== */}
      {animeId && (
        <AnimeInfoCard
          animeId={animeId}
          isVisible={showAnimeInfo}
          onMouseEnter={handleShowAnimeInfo}
          onMouseLeave={handleHideAnimeInfo}
        />
      )}
    </>
  );
}

export default ToolbarRefactored;
