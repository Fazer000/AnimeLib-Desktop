import { Box, Divider, useTheme } from '@mui/material';
import {
  Captions,
  FastForward,
  Gauge,
  SkipForward,
  Sparkles,
} from '../../icons';
import {
  SkipManager,
  SubtitleTrack,
  SubtitlesSettings,
} from '../../../services/player';
import {
  getQualityTagColor,
  getQualityTagFromResolution,
} from '../../../utils/videoHelpers';
import { formatUpscaleSummary } from '../../../utils/upscaleMode';
import { qualitySummary } from '../../../utils/autoQuality';
import type { QualityModeState } from '../../../services/player';
import { NavRow, ToggleRow } from './rows';
import { MENU_ICON_SIZE, menuIconBoxSx } from './styles';
import type { AutoSkipSettings, MenuPage, UpscaleControls } from './types';
import {} from '../../../theme/palette';

interface MainPageProps {
  qualityOptions: Array<{ label: string; value: string }>;
  selectedQuality: string;
  qualityMode: QualityModeState;
  playbackRate: number;
  skipManager: SkipManager;
  autoSkipSettings: AutoSkipSettings;
  subtitleTracks: SubtitleTrack[];
  subtitleSettings: SubtitlesSettings;
  autoplayEnabled: boolean;
  ambientLightEnabled: boolean;
  onNavigate: (page: MenuPage) => void;
  onAutoplayChange?: (enabled: boolean) => void;
  onAmbientLightChange?: (enabled: boolean) => void;
  upscaleControls?: UpscaleControls | null;
}

/** Возвращает подпись активной дорожки субтитров. */
const subtitlesSummary = (
  tracks: SubtitleTrack[],
  settings: SubtitlesSettings,
): string => {
  if (tracks.length === 0) return 'Недоступны';

  const active = tracks.find((track) => track.name === settings.trackName);
  return active ? active.name : 'Выключены';
};

/** Корневая страница меню настроек. */
function MainPage({
  qualityOptions,
  selectedQuality,
  qualityMode,
  playbackRate,
  skipManager,
  autoSkipSettings,
  subtitleTracks,
  subtitleSettings,
  autoplayEnabled,
  ambientLightEnabled,
  onNavigate,
  onAutoplayChange,
  onAmbientLightChange,
  upscaleControls,
}: MainPageProps) {
  const { customColors } = useTheme().palette;
  const qualityTag = getQualityTagFromResolution(selectedQuality);
  const qualityColor = qualityTag
    ? getQualityTagColor(qualityTag)
    : customColors.onVideoAccentColor;
  const activeSkips = Object.values(autoSkipSettings).filter(Boolean).length;

  return (
    <Box>
      <NavRow
        icon={<Box sx={menuIconBoxSx(qualityColor)}>{qualityTag || '—'}</Box>}
        title="Качество"
        value={qualitySummary(
          qualityMode.auto,
          qualityOptions.find((q) => q.value === selectedQuality)?.label ?? '',
        )}
        onClick={() => onNavigate('quality')}
      />

      {upscaleControls && (
        <NavRow
          icon={
            <Box sx={menuIconBoxSx(customColors.onVideoAccentColor)}>
              <Sparkles sx={{ fontSize: MENU_ICON_SIZE }} />
            </Box>
          }
          title="Повышение качества"
          value={
            upscaleControls.supported
              ? formatUpscaleSummary(
                  upscaleControls.mode,
                  upscaleControls.activePreset,
                  upscaleControls.failed,
                )
              : 'Недоступно'
          }
          onClick={() => onNavigate('upscale')}
        />
      )}

      <NavRow
        icon={
          <Box sx={menuIconBoxSx(customColors.onVideoAccentColor)}>
            <Gauge sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Скорость"
        value={`${playbackRate}x`}
        onClick={() => onNavigate('speed')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx(customColors.onVideoAccentColor)}>
            <FastForward sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Перемотка"
        value={skipManager.formatSkipTime()}
        onClick={() => onNavigate('skip')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx(customColors.onVideoAccentColor)}>
            <SkipForward sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Автопропуск"
        value={`${activeSkips} активных`}
        onClick={() => onNavigate('autoSkip')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx(customColors.onVideoAccentColor)}>
            <Captions sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Субтитры"
        value={subtitlesSummary(subtitleTracks, subtitleSettings)}
        onClick={() => onNavigate('subtitles')}
        noWrapValue
      />

      <Divider />

      <ToggleRow
        title="Автовоспроизведение"
        checked={autoplayEnabled}
        onChange={(checked) => onAutoplayChange?.(checked)}
      />

      <ToggleRow
        title="Адаптивная подсветка"
        checked={ambientLightEnabled}
        onChange={(checked) => onAmbientLightChange?.(checked)}
      />
    </Box>
  );
}

MainPage.defaultProps = {
  onAutoplayChange: undefined,
  onAmbientLightChange: undefined,
  upscaleControls: null,
};

export default MainPage;
