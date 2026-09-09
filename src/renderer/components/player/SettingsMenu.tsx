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
  SETTINGS_MENU_MARGIN,
  SETTINGS_MENU_WIDTH,
  SUBTITLES_DEFAULT_SETTINGS,
} from '../../../constants';
import MainPage from './settings/MainPage';
import QualityPage from './settings/QualityPage';
import SpeedPage from './settings/SpeedPage';
import SkipPage from './settings/SkipPage';
import AutoSkipPage from './settings/AutoSkipPage';
import SubtitlesPage from './settings/SubtitlesPage';
import type { AutoSkipSettings, MenuPage } from './settings/types';

const DEFAULT_AUTO_SKIP: AutoSkipSettings = {
  skipOpenings: false,
  skipEndings: false,
  skipCompilations: false,
  skipSplashScreens: false,
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
  autoSkipSettings = DEFAULT_AUTO_SKIP,
  onAutoSkipChange,
  subtitleTracks = [],
  subtitleSettings = SUBTITLES_DEFAULT_SETTINGS,
  onSubtitleTrackChange,
  onSubtitleSettingsChange,
}: SettingsMenuProps) {
  const { customColors } = useTheme().palette;
  const [currentPage, setCurrentPage] = useState<MenuPage>('main');

  const closeMenu = () => {
    onClose();
    setCurrentPage('main');
  };

  const backToMain = () => setCurrentPage('main');

  if (!anchorEl) return null;

  return (
    <>
      <Box
        sx={BACKDROP_SX}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          closeMenu();
        }}
      />

      <Box
        sx={panelSx(showEpisodes, customColors)}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
            onNavigate={setCurrentPage}
            onAutoplayChange={onAutoplayChange}
            onAmbientLightChange={onAmbientLightChange}
          />
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
    </>
  );
}

SettingsMenu.defaultProps = {
  onAutoplayChange: undefined,
  onAmbientLightChange: undefined,
  autoSkipSettings: DEFAULT_AUTO_SKIP,
  onAutoSkipChange: undefined,
  subtitleTracks: [],
  subtitleSettings: SUBTITLES_DEFAULT_SETTINGS,
  onSubtitleTrackChange: undefined,
  onSubtitleSettingsChange: undefined,
};

export default SettingsMenu;
