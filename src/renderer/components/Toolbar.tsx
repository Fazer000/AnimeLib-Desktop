/* eslint-disable react/prop-types, react/require-default-props */
import React from 'react';
import { AppBar, Toolbar } from '@mui/material';
import NavigationButtons from './toolbar/NavigationButtons';
import UrlBar from './toolbar/UrlBar';
import WindowControls from './toolbar/WindowControls';

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
}: ToolbarProps) {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: `${backgroundColor} !important`,
        WebkitAppRegion: 'drag',
        appRegion: 'drag',
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
  );
}

export default ToolbarRefactored;
