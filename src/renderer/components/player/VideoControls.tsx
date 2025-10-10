/* eslint-disable no-console */
import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, useTheme, Button } from '@mui/material';
import {
  TuneRounded,
  FullscreenRounded,
  FullscreenExitRounded,
  PictureInPictureAltRounded,
  ListRounded,
  BookmarkAddRounded,
} from '@mui/icons-material';

import ProgressBar from './ProgressBar';
import PlaybackControls from './PlaybackControls';
import VolumeControl from './VolumeControl';
import ControlsEpisodeSlider from './ControlsEpisodeSlider';
import SettingsMenu from './SettingsMenu';
import { SkipManager, ThumbnailManager } from '../../services/player';

interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

interface VideoControlsProps {
  // Состояние плеера
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  buffered: number;
  isFullscreen: boolean;
  showControls: boolean;
  onMenuOpenChange: (isOpen: boolean) => void;
  autoplayEnabled?: boolean;
  onAutoplayChange?: (enabled: boolean) => void;
  showEpisodes?: boolean;
  onShowEpisodesChange?: (show: boolean) => void;

  // Опции качества
  qualityOptions: Array<{
    label: string;
    value: string;
  }>;
  selectedQuality: string;
  playbackRate: number;

  // Эпизоды
  episodes: Array<{ id: number; number: string; name: string }>;
  currentEpisodeIndex: number;
  onEpisodeSelect: (index: number) => void;
  bookmarkedEpisodeId?: number | null;

  // Обработчики
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePictureInPicture: () => void;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkipForward: (seconds: number) => void;
  onSkipTimeChange?: (time: number) => void;

  // Обработчики мыши
  onMouseMove: () => void;
  onMouseLeave: () => void;
  onProgressMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgressMouseLeave: () => void;
  onSeek: (time: number) => void;

  // Состояние превью
  hoverTime: number | null;

  // Сохранение закладки
  onSaveBookmark?: () => void;
  hasBookmark?: boolean;

  // Сегменты (опенинг, эндинг)
  timecode: TimeCode[];
  currentSegment?: TimeCode | null;
  onSkipSegment?: () => void;

  // Auto skip settings
  autoSkipSettings?: {
    skipOpenings: boolean;
    skipEndings: boolean;
    skipCompilations: boolean;
    skipSplashScreens: boolean;
  };
  onAutoSkipChange?: (settings: {
    skipOpenings: boolean;
    skipEndings: boolean;
    skipCompilations: boolean;
    skipSplashScreens: boolean;
  }) => void;

  // Thumbnail manager
  thumbnailManager?: ThumbnailManager | null;
}

/**
 * Контролы видеоплеера
 * Использует компонентную ООП-архитектуру
 */
function VideoControls({
  isPlaying,
  isLoading,
  currentTime,
  duration,
  volume,
  isMuted,
  buffered,
  isFullscreen,
  showControls,
  onMenuOpenChange,
  onSaveBookmark,
  hasBookmark,
  qualityOptions,
  selectedQuality,
  playbackRate,
  episodes,
  currentEpisodeIndex,
  onEpisodeSelect,
  bookmarkedEpisodeId,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onTogglePictureInPicture,
  onQualityChange,
  onPlaybackRateChange,
  onSkipForward,
  onSkipTimeChange,
  onMouseMove,
  onMouseLeave,
  onProgressMouseMove,
  onProgressMouseLeave,
  onSeek,
  hoverTime,
  autoplayEnabled = false,
  onAutoplayChange,
  timecode = [],
  currentSegment,
  onSkipSegment,
  showEpisodes = false,
  onShowEpisodesChange,
  autoSkipSettings,
  onAutoSkipChange,
  thumbnailManager = null,
}: VideoControlsProps) {
  const theme = useTheme();
  // UI State
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);

  // Skip Manager
  const [skipManager] = useState(() => new SkipManager());
  const [skipTime, setSkipTime] = useState(skipManager.getSkipTime());

  // Volume tooltip timer
  const [volumeTooltipTimer, setVolumeTooltipTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (volumeTooltipTimer) {
        clearTimeout(volumeTooltipTimer);
      }
    };
  }, [volumeTooltipTimer]);

  // Handle volume change with tooltip
  const handleVolumeChange = (vol: number) => {
    onVolumeChange(vol);

    // Show tooltip
    setShowVolumeTooltip(true);

    // Clear previous timer
    if (volumeTooltipTimer) {
      clearTimeout(volumeTooltipTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      setShowVolumeTooltip(false);
    }, 1500);
    setVolumeTooltipTimer(timer);
  };

  // Handle settings menu
  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    console.log('[VideoControls] Opening settings menu');
    setAnchorEl(event.currentTarget);
    onMenuOpenChange?.(true);
  };

  const handleSettingsMenuClose = () => {
    console.log('[VideoControls] Closing settings menu');
    setAnchorEl(null);
    onMenuOpenChange?.(false);
  };

  // Handle episodes
  const handleToggleEpisodes = () => {
    const newShowEpisodes = !showEpisodes;
    onShowEpisodesChange?.(newShowEpisodes);
    onMenuOpenChange(newShowEpisodes);
  };

  const handleEpisodeSelect = (index: number) => {
    onEpisodeSelect(index);
    onShowEpisodesChange?.(false);
    onMenuOpenChange(false);
  };

  return (
    <>
      {/* Top gradient */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          left: 0,
          height: '40%',
          width: '100%',
          background:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.53) 5%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

      {/* Skip Segment Button */}
      {currentSegment && showControls && onSkipSegment && (
        <Box
          sx={{
            position: 'absolute',
            bottom: showEpisodes ? 135 : 85,
            right: isFullscreen ? 70 : 16,
            zIndex: 900,
            opacity: showControls ? 1 : 0,
            transition: 'opacity, bottom 0.3s ease-in-out',
            animation: 'fadeInSlideUp 0.3s ease-out',
            '@keyframes fadeInSlideUp': {
              from: {
                opacity: 0,
                transform: 'translateY(10px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
          onMouseMove={onMouseMove}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSkipSegment();
            }}
            sx={{
              backgroundColor: 'rgba(20, 20, 20, 0.45)',
              border: '1px solid rgba(116, 116, 128, 0.33)',
              color: theme.palette.customColors.dtPrimaryTextColor,
              padding: '10px 20px',
              borderRadius: 2,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              px: 2,
              py: 0.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(116, 116, 128, 0.3)',
              },
              '&:active': {
                transform: 'scale(0.96)',
              },
            }}
          >
            {(() => {
              switch (currentSegment.type) {
                case 'opening':
                  return 'Пропустить опенинг';
                case 'ending':
                  return 'Пропустить эндинг';
                case 'compilation':
                  return 'Пропустить компиляцию';
                default:
                  return 'Пропустить заставку';
              }
            })()}
          </Button>
        </Box>
      )}

      {/* Episodes button (above progress bar) */}
      {isFullscreen && episodes && episodes.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: isFullscreen && showEpisodes ? '130px' : '80px',
            right: 16,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out, bottom 0.3s ease-in-out',
            zIndex: 901,
          }}
          onMouseMove={onMouseMove}
        >
          <Tooltip title="Эпизоды" placement="left">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleToggleEpisodes();
              }}
              sx={{
                backgroundColor: 'rgba(20, 20, 20, 0.45)',
                border: '1px solid rgba(116, 116, 128, 0.33)',
                color: theme.palette.customColors.dtPrimaryTextColor,
                padding: 1,
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'rgba(55, 55, 55, 0.52)',
                },
                '&:active': {
                  transform: 'translateY(0px) scale(0.96)',
                  transition: 'all 0.1s ease',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <ListRounded fontSize="medium" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Bottom gradient - отдельный блок */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: isFullscreen && showEpisodes ? '130px' : '70px',
          opacity: showEpisodes ? 1 : 0.8,
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 30%, transparent 100%)',
          transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out',
          pointerEvents: 'none',
          zIndex: 899,
        }}
      />

      {/* Main controls container */}
      <Box
        className="player-controls video-controls"
        sx={{
          position: 'absolute',
          bottom: isFullscreen && showEpisodes ? '50px' : 0,
          left: 0,
          right: 0,
          padding: 1,
          opacity: showControls ? 1 : 0,
          transition:
            'opacity 0.25s ease-in-out, bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 900,
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {/* Progress Bar */}
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          hoverTime={hoverTime}
          onSeek={onSeek}
          onProgressMouseMove={onProgressMouseMove}
          onProgressMouseLeave={onProgressMouseLeave}
          timecode={timecode}
          thumbnailManager={thumbnailManager}
        />

        {/* Main controls row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            my: 0.5,
            mx: 1,
          }}
        >
          {/* Left: Playback controls */}
          <PlaybackControls
            isPlaying={isPlaying}
            isLoading={isLoading}
            currentTime={currentTime}
            duration={duration}
            skipTime={skipTime}
            onTogglePlay={onTogglePlay}
            onSkipForward={onSkipForward}
          />

          {/* Right: Additional controls */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {/* Volume Control */}
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              showTooltip={showVolumeTooltip}
              onVolumeChange={handleVolumeChange}
              onToggleMute={onToggleMute}
            />

            {/* Save Bookmark */}
            {onSaveBookmark && (
              <Tooltip title="Сохранить закладку" placement="top">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveBookmark();
                  }}
                  sx={{
                    color: hasBookmark ? '#7C3AED' : 'white',
                    padding: 0.25,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'scale(1.1)',
                      color: '#7C3AED',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <BookmarkAddRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Settings */}
            <Tooltip title="Настройки">
              <IconButton
                onClick={handleSettingsMenuOpen}
                sx={{
                  color: 'white',
                  padding: 0.25,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.1)',
                    color: '#7C3AED',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <TuneRounded fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Picture-in-Picture */}
            <Tooltip title="Миниокно">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePictureInPicture();
                }}
                sx={{
                  color: 'white',
                  padding: 0.25,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.1)',
                    color: '#7C3AED',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <PictureInPictureAltRounded fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Fullscreen */}
            <Tooltip
              title={
                isFullscreen
                  ? 'Выйти из полноэкранного режима'
                  : 'Полноэкранный режим'
              }
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFullscreen();
                }}
                sx={{
                  color: 'white',
                  padding: 0.25,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'scale(1.1)',
                    color: '#7C3AED',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {isFullscreen ? (
                  <FullscreenExitRounded fontSize="small" />
                ) : (
                  <FullscreenRounded fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Episode Carousel (fullscreen only) */}
      {isFullscreen && (
        <ControlsEpisodeSlider
          episodes={episodes}
          currentEpisodeIndex={currentEpisodeIndex}
          showEpisodes={showEpisodes}
          onEpisodeSelect={handleEpisodeSelect}
          onMenuOpenChange={onMenuOpenChange}
          bookmarkedEpisodeId={bookmarkedEpisodeId}
        />
      )}

      {/* Settings Menu */}
      <SettingsMenu
        anchorEl={anchorEl}
        onClose={handleSettingsMenuClose}
        qualityOptions={qualityOptions}
        selectedQuality={selectedQuality}
        playbackRate={playbackRate}
        skipManager={skipManager}
        onQualityChange={onQualityChange}
        onPlaybackRateChange={onPlaybackRateChange}
        onSkipTimeChange={(time) => {
          skipManager.setSkipTime(time);
          setSkipTime(time);
          onSkipTimeChange?.(time); // Notify parent component
        }}
        showEpisodes={showEpisodes}
        autoplayEnabled={autoplayEnabled}
        onAutoplayChange={onAutoplayChange}
        autoSkipSettings={autoSkipSettings}
        onAutoSkipChange={onAutoSkipChange}
      />
    </>
  );
}

VideoControls.defaultProps = {
  onSaveBookmark: undefined,
  hasBookmark: false,
  onSkipTimeChange: undefined,
  bookmarkedEpisodeId: null,
  autoplayEnabled: false,
  onAutoplayChange: undefined,
  currentSegment: null,
  onSkipSegment: undefined,
  showEpisodes: false,
  onShowEpisodesChange: undefined,
  autoSkipSettings: {
    skipOpenings: false,
    skipEndings: false,
    skipCompilations: false,
    skipSplashScreens: false,
  },
  onAutoSkipChange: undefined,
  thumbnailManager: null,
};

export default VideoControls;
