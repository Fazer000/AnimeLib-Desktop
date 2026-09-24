import React, { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import type { CustomColors } from '@mui/material/styles';
import {
  SkipManager,
  SubtitleTrack,
  SubtitlesSettings,
} from '../../services/player';
import { SubtitleStyleSettings } from '../../utils/subtitleHelpers';
import {
  SETTINGS_MENU_EASING,
  SETTINGS_MENU_MARGIN,
  SETTINGS_MENU_SLIDE_PX,
  SETTINGS_MENU_TRANSITION_MS,
  SETTINGS_MENU_WIDTH,
  SUBTITLES_DEFAULT_SETTINGS,
} from '../../../constants';
import MainPage from './settings/MainPage';
import QualityPage from './settings/QualityPage';
import SpeedPage from './settings/SpeedPage';
import SkipPage from './settings/SkipPage';
import AutoSkipPage from './settings/AutoSkipPage';
import SubtitlesPage from './settings/SubtitlesPage';
import UpscalePage from './settings/UpscalePage';
import type {
  AutoSkipSettings,
  MenuPage,
  UpscaleControls,
} from './settings/types';
import {
  SLIDE_BACK,
  SLIDE_FORWARD,
  getMenuDirection,
  getPageAnimationName,
} from './settings/navigation';
import type { MenuDirection } from './settings/navigation';
import useContentHeight from '../../hooks/useContentHeight';

const DEFAULT_AUTO_SKIP: AutoSkipSettings = {
  skipOpenings: false,
  skipEndings: false,
  skipCompilations: false,
  skipSplashScreens: false,
};

const HEIGHT_SX = {
  overflow: 'hidden',
  transition: `height ${SETTINGS_MENU_TRANSITION_MS}ms ${SETTINGS_MENU_EASING}`,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
};

const PAGE_KEYFRAMES_SX = {
  [`@keyframes ${SLIDE_FORWARD}`]: {
    from: { opacity: 0, transform: `translateX(${SETTINGS_MENU_SLIDE_PX}px)` },
    to: { opacity: 1, transform: 'none' },
  },
  [`@keyframes ${SLIDE_BACK}`]: {
    from: { opacity: 0, transform: `translateX(-${SETTINGS_MENU_SLIDE_PX}px)` },
    to: { opacity: 1, transform: 'none' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const BACKDROP_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1999,
};

const panelSx = (showEpisodes: boolean, colors: CustomColors) => {
  const bottom = showEpisodes ? 120 : 70;

  return {
    position: 'absolute',
    bottom,
    right: SETTINGS_MENU_MARGIN,
    zIndex: 2000,
    py: 1,
    transition: 'bottom 0.3s ease-in-out',
    backgroundColor: `rgba(${colors.onVideoSurfaceRgb}, 0.82)`,
    border: `1px solid rgba(${colors.neutralRgb}, 0.33)`,
    color: colors.onVideoColor,
    width: `min(${SETTINGS_MENU_WIDTH}px, calc(100cqw - ${SETTINGS_MENU_MARGIN * 2}px))`,
    maxHeight: `calc(100cqh - ${bottom + SETTINGS_MENU_MARGIN}px)`,
    overflowY: 'auto',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(10px)',
    animation: 'menuFadeIn 0.1s ease-out',
    '@keyframes menuFadeIn': {
      '0%': { opacity: 0, transform: 'translateY(10px) scale(0.95)' },
      '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
    },
  };
};

interface SettingsMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  qualityOptions: Array<{ label: string; value: string }>;
  selectedQuality: string;
  playbackRate: number;
  skipManager: SkipManager;
  onQualityChange: (quality: string) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkipTimeChange: (time: number) => void;
  showEpisodes: boolean;
  autoplayEnabled: boolean;
  onAutoplayChange?: (enabled: boolean) => void;
  ambientLightEnabled: boolean;
  onAmbientLightChange?: (enabled: boolean) => void;
  upscaleControls?: UpscaleControls | null;
  autoSkipSettings?: AutoSkipSettings;
  onAutoSkipChange?: (settings: AutoSkipSettings) => void;
  subtitleTracks?: SubtitleTrack[];
  subtitleSettings?: SubtitlesSettings;
  onSubtitleTrackChange?: (trackName: string | null) => void;
  onSubtitleSettingsChange?: (patch: Partial<SubtitleStyleSettings>) => void;
}

/**
 * Меню настроек видеоплеера: оболочка с подложкой и переключением страниц
 */
function SettingsMenu({
  anchorEl,
  onClose,
  qualityOptions,
  selectedQuality,
  playbackRate,
  skipManager,
  onQualityChange,
  onPlaybackRateChange,
  onSkipTimeChange,
  showEpisodes = false,
  autoplayEnabled,
  onAutoplayChange,
  ambientLightEnabled,
  onAmbientLightChange,
  upscaleControls = null,
  autoSkipSettings = DEFAULT_AUTO_SKIP,
  onAutoSkipChange,
  subtitleTracks = [],
  subtitleSettings = SUBTITLES_DEFAULT_SETTINGS,
  onSubtitleTrackChange,
  onSubtitleSettingsChange,
}: SettingsMenuProps) {
  const { customColors } = useTheme().palette;
  const [currentPage, setCurrentPage] = useState<MenuPage>('main');
  const [direction, setDirection] = useState<MenuDirection>('none');
  const [measureRef, contentHeight] = useContentHeight();

  const navigate = (page: MenuPage) => {
    setDirection(getMenuDirection(page));
    setCurrentPage(page);
  };

  const closeMenu = () => {
    onClose();
    setDirection('none');
    setCurrentPage('main');
  };

  const backToMain = () => navigate('main');

  const animationName = getPageAnimationName(direction);

  if (!anchorEl) return null;

  return (
    <>
      <Box
        data-wheel-volume-ignore="true"
        sx={BACKDROP_SX}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          closeMenu();
        }}
      />

      <Box
        data-wheel-volume-ignore="true"
        sx={panelSx(showEpisodes, customColors)}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <Box sx={{ ...HEIGHT_SX, height: contentHeight ?? 'auto' }}>
          <Box ref={measureRef}>
            <Box
              key={currentPage}
              sx={{
                ...PAGE_KEYFRAMES_SX,
                animation: animationName
                  ? `${animationName} ${SETTINGS_MENU_TRANSITION_MS}ms ${SETTINGS_MENU_EASING}`
                  : 'none',
              }}
            >
              {currentPage === 'main' && (
                <MainPage
                  qualityOptions={qualityOptions}
                  selectedQuality={selectedQuality}
                  playbackRate={playbackRate}
                  skipManager={skipManager}
                  autoSkipSettings={autoSkipSettings}
                  subtitleTracks={subtitleTracks}
                  subtitleSettings={subtitleSettings}
                  autoplayEnabled={autoplayEnabled}
                  ambientLightEnabled={ambientLightEnabled}
                  onNavigate={navigate}
                  onAutoplayChange={onAutoplayChange}
                  onAmbientLightChange={onAmbientLightChange}
                  upscaleControls={upscaleControls}
                />
              )}

              {currentPage === 'upscale' && upscaleControls && (
                <UpscalePage controls={upscaleControls} onBack={backToMain} />
              )}

              {currentPage === 'quality' && (
                <QualityPage
                  options={qualityOptions}
                  selected={selectedQuality}
                  onSelect={(quality) => {
                    onQualityChange(quality);
                    closeMenu();
                  }}
                  onBack={backToMain}
                />
              )}

              {currentPage === 'speed' && (
                <SpeedPage
                  playbackRate={playbackRate}
                  onSelect={onPlaybackRateChange}
                  onBack={backToMain}
                />
              )}

              {currentPage === 'skip' && (
                <SkipPage
                  skipManager={skipManager}
                  onSkipTimeChange={onSkipTimeChange}
                  onBack={backToMain}
                />
              )}

              {currentPage === 'autoSkip' && (
                <AutoSkipPage
                  settings={autoSkipSettings}
                  onChange={onAutoSkipChange}
                  onBack={backToMain}
                />
              )}

              {currentPage === 'subtitles' && (
                <SubtitlesPage
                  tracks={subtitleTracks}
                  settings={subtitleSettings}
                  onTrackChange={onSubtitleTrackChange}
                  onSettingsChange={onSubtitleSettingsChange}
                  onBack={backToMain}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

SettingsMenu.defaultProps = {
  onAutoplayChange: undefined,
  onAmbientLightChange: undefined,
  upscaleControls: null,
  autoSkipSettings: DEFAULT_AUTO_SKIP,
  onAutoSkipChange: undefined,
  subtitleTracks: [],
  subtitleSettings: SUBTITLES_DEFAULT_SETTINGS,
  onSubtitleTrackChange: undefined,
  onSubtitleSettingsChange: undefined,
};

export default SettingsMenu;
