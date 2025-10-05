/* eslint-disable no-console */
import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
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
import { SkipManager } from '../../services/player';

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
}: VideoControlsProps) {
  const theme = useTheme();
  // UI State
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showEpisodes, setShowEpisodes] = useState<boolean>(false);
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
    setShowEpisodes(newShowEpisodes);
    onMenuOpenChange(newShowEpisodes);
  };

  const handleEpisodeSelect = (index: number) => {
    onEpisodeSelect(index);
    setShowEpisodes(false);
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
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.27) 5%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

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
                  color: theme.palette.customColors.dtSecondaryColor,
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

      {/* Main controls container */}
      <Box
        className="player-controls video-controls"
        sx={{
          position: 'absolute',
          bottom: isFullscreen && showEpisodes ? '50px' : 0,
          left: 0,
          right: 0,
          background:
            isFullscreen && showEpisodes
              ? 'rgba(0, 0, 0, 0)'
              : 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
          padding: 1,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out, bottom 0.3s ease-in-out',
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
      />
    </>
  );
}

VideoControls.defaultProps = {
  onSaveBookmark: undefined,
  hasBookmark: false,
  onSkipTimeChange: undefined,
  bookmarkedEpisodeId: null,
};

export default VideoControls;
