/* eslint-disable no-console */
import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, useTheme, Button } from '@mui/material';
import {
  SettingsRounded,
  FullscreenRounded,
  FullscreenExitRounded,
  PictureInPictureAltRounded,
  ListRounded,
  BookmarkAddRounded,
  GraphicEqRounded,
  DownloadRounded,
} from '@mui/icons-material';

import ProgressBar from './ProgressBar';
import PlaybackControls from './PlaybackControls';
import VolumeControl from './VolumeControl';
import ControlsEpisodeSlider from './ControlsEpisodeSlider';
import ControlTooltip from './ControlTooltip';
import EdgeActionButton from '../EdgeActionButton';
import SettingsMenu from './SettingsMenu';
import {
  SkipManager,
  ThumbnailManager,
  SubtitleTrack,
  SubtitlesSettings,
} from '../../services/player';
import { SubtitleStyleSettings } from '../../utils/subtitleHelpers';
import {
  getQualityTagFromResolution,
  getQualityTagColor,
} from '../../utils/videoHelpers';
import {
  PLAYER_CONTROL_ICON_SIZE,
  PLAYER_FULLSCREEN_EASING,
  PLAYER_FULLSCREEN_TRANSITION,
} from '../../../constants';

const ICON_SX = { fontSize: `${PLAYER_CONTROL_ICON_SIZE}px` };

const OVERLAY_APPEAR_SX = {
  animation: `overlayAppear ${PLAYER_FULLSCREEN_TRANSITION}ms ${PLAYER_FULLSCREEN_EASING}`,
  '@keyframes overlayAppear': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
};

interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

interface VideoControlsProps {
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
  ambientLightEnabled?: boolean;
  onAmbientLightChange?: (enabled: boolean) => void;
  onAutoplayChange?: (enabled: boolean) => void;
  showEpisodes?: boolean;
  onShowEpisodesChange?: (show: boolean) => void;

  qualityOptions: Array<{
    label: string;
    value: string;
  }>;
  selectedQuality: string;
  playbackRate: number;

  episodes: Array<{ id: number; number: string; name: string }>;
  currentEpisodeIndex: number;
  onEpisodeSelect: (index: number) => void;
  bookmarkedEpisodeId?: number | null;

  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePictureInPicture: () => void;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkipForward: (seconds: number) => void;
  onSkipTimeChange?: (time: number) => void;

  onMouseMove: () => void;
  onMouseLeave: () => void;
  onProgressMouseMove: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgressMouseLeave: () => void;
  onSeek: (time: number) => void;

  hoverTime: number | null;

  onSaveBookmark?: () => void;
  hasBookmark?: boolean;

  timecode: TimeCode[];
  currentSegment?: TimeCode | null;
  onSkipSegment?: () => void;

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

  subtitleTracks?: SubtitleTrack[];
  subtitleSettings?: SubtitlesSettings;
  onSubtitleTrackChange?: (trackName: string | null) => void;
  onSubtitleSettingsChange?: (patch: Partial<SubtitleStyleSettings>) => void;

  thumbnailManager?: ThumbnailManager | null;

  sidebarCollapsed: boolean;
  // eslint-disable-next-line react/require-default-props
  onSidebarToggle?: () => void;
  // eslint-disable-next-line react/require-default-props
  onOpenDownloadManager?: () => void;
  // eslint-disable-next-line react/require-default-props
  downloadManagerOpen?: boolean;
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
  ambientLightEnabled = true,
  onAmbientLightChange,
  onAutoplayChange,
  timecode = [],
  currentSegment,
  onSkipSegment,
  showEpisodes = false,
  onShowEpisodesChange,
  autoSkipSettings,
  onAutoSkipChange,
  subtitleTracks = [],
  subtitleSettings,
  onSubtitleTrackChange,
  onSubtitleSettingsChange,
  thumbnailManager = null,
  sidebarCollapsed = false,
  onSidebarToggle,
  onOpenDownloadManager,
  downloadManagerOpen = false,
}: VideoControlsProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);

  const [skipManager] = useState(() => new SkipManager());
  const [skipTime, setSkipTime] = useState(skipManager.getSkipTime());

  const [volumeTooltipTimer, setVolumeTooltipTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (volumeTooltipTimer) {
        clearTimeout(volumeTooltipTimer);
      }
    };
  }, [volumeTooltipTimer]);

  const handleVolumeChange = (vol: number) => {
    onVolumeChange(vol);

    setShowVolumeTooltip(true);

    if (volumeTooltipTimer) {
      clearTimeout(volumeTooltipTimer);
    }

    const timer = setTimeout(() => {
      setShowVolumeTooltip(false);
    }, 1500);
    setVolumeTooltipTimer(timer);
  };

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

  const handleToggleEpisodes = () => {
    onShowEpisodesChange?.(!showEpisodes);
  };

  const handleEpisodeSelect = (index: number) => {
    onEpisodeSelect(index);
  };

  const episodesVisible = isFullscreen && showEpisodes;

  const qualityBadge = getQualityTagFromResolution(selectedQuality);

  const overlayButtonSx = {
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
  };

  // @ts-ignore
  return (
    <>
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

      {onOpenDownloadManager && !isFullscreen && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 0,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.3s ease-in-out',
            zIndex: 901,
            ...OVERLAY_APPEAR_SX,
          }}
          onMouseMove={onMouseMove}
        >
          <EdgeActionButton
            side="left"
            active={downloadManagerOpen}
            label="Загрузки"
            color={theme.palette.customColors.dtPrimaryTextColor}
            onClick={onOpenDownloadManager}
            icon={<DownloadRounded sx={ICON_SX} />}
          />
        </Box>
      )}

      {onSidebarToggle && !isFullscreen && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 0,
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.3s ease-in-out',
            zIndex: 901,
            ...OVERLAY_APPEAR_SX,
          }}
          onMouseMove={onMouseMove}
        >
          <EdgeActionButton
            side="right"
            label={sidebarCollapsed ? 'Показать озвучки' : 'Скрыть озвучки'}
            color={
              sidebarCollapsed
                ? theme.palette.customColors.dtPrimaryTextColor
                : '#7C3AED'
            }
            onClick={onSidebarToggle}
            icon={<GraphicEqRounded sx={ICON_SX} />}
          />
        </Box>
      )}

      {currentSegment && showControls && onSkipSegment && (
        <Box
          sx={{
            position: 'absolute',
            bottom: episodesVisible ? 135 : 85,
            right: 16,
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

      {isFullscreen && episodes && episodes.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: episodesVisible ? '130px' : '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 0.3s ease-in-out, bottom 0.3s ease-in-out',
            zIndex: 901,
            ...OVERLAY_APPEAR_SX,
          }}
          onMouseMove={onMouseMove}
        >
          <ControlTooltip
            title={episodesVisible ? 'Скрыть эпизоды' : 'Показать эпизоды'}
            placement="top"
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleToggleEpisodes();
              }}
              sx={{
                ...overlayButtonSx,
                color: episodesVisible
                  ? '#7C3AED'
                  : theme.palette.customColors.dtPrimaryTextColor,
              }}
            >
              <ListRounded sx={ICON_SX} />
            </IconButton>
          </ControlTooltip>
        </Box>
      )}

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: episodesVisible ? '130px' : '70px',
          opacity: episodesVisible ? 1 : 0.8,
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 30%, transparent 100%)',
          transition: 'opacity 0.3s ease-in-out, height 0.3s ease-in-out',
          pointerEvents: 'none',
          zIndex: 899,
        }}
      />

      <Box
        className="player-controls video-controls"
        sx={{
          position: 'absolute',
          bottom: episodesVisible ? '50px' : 0,
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
          <PlaybackControls
            isPlaying={isPlaying}
            isLoading={isLoading}
            currentTime={currentTime}
            duration={duration}
            skipTime={skipTime}
            onTogglePlay={onTogglePlay}
            onSkipForward={onSkipForward}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              showTooltip={showVolumeTooltip}
              onVolumeChange={handleVolumeChange}
              onToggleMute={onToggleMute}
            />

            {onSaveBookmark && (
              <ControlTooltip title="Сохранить закладку" placement="top">
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
                  <BookmarkAddRounded sx={ICON_SX} />
                </IconButton>
              </ControlTooltip>
            )}

            <ControlTooltip title="Настройки">
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
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <SettingsRounded sx={ICON_SX} />

                  {qualityBadge && (
                    <Typography
                      sx={{
                        position: 'absolute',
                        top: -2,
                        right: -8,
                        px: 0.4,
                        borderRadius: 0.5,
                        backgroundColor: getQualityTagColor(qualityBadge),
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 700,
                        lineHeight: 1.4,
                        pointerEvents: 'none',
                      }}
                    >
                      {qualityBadge}
                    </Typography>
                  )}
                </Box>
              </IconButton>
            </ControlTooltip>

            <ControlTooltip title="Миниокно">
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
                <PictureInPictureAltRounded sx={ICON_SX} />
              </IconButton>
            </ControlTooltip>

            <ControlTooltip
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
                  <FullscreenExitRounded sx={ICON_SX} />
                ) : (
                  <FullscreenRounded sx={ICON_SX} />
                )}
              </IconButton>
            </ControlTooltip>
          </Box>
        </Box>
      </Box>

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
          onSkipTimeChange?.(time);
        }}
        showEpisodes={episodesVisible}
        autoplayEnabled={autoplayEnabled}
        onAutoplayChange={onAutoplayChange}
        autoSkipSettings={autoSkipSettings}
        onAutoSkipChange={onAutoSkipChange}
        ambientLightEnabled={ambientLightEnabled}
        onAmbientLightChange={onAmbientLightChange}
        subtitleTracks={subtitleTracks}
        subtitleSettings={subtitleSettings}
        onSubtitleTrackChange={onSubtitleTrackChange}
        onSubtitleSettingsChange={onSubtitleSettingsChange}
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
  ambientLightEnabled: true,
  onAmbientLightChange: undefined,
  subtitleTracks: [],
  subtitleSettings: undefined,
  onSubtitleTrackChange: undefined,
  onSubtitleSettingsChange: undefined,
};
export default VideoControls;
