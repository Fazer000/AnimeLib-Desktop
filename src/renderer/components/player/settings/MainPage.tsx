import { Box, Divider } from '@mui/material';
import {
  FastForwardOutlined,
  SkipNextOutlined,
  SpeedOutlined,
  SubtitlesOutlined,
} from '@mui/icons-material';
import {
  SkipManager,
  SubtitleTrack,
  SubtitlesSettings,
} from '../../../services/player';
import {
  getQualityTagColor,
  getQualityTagFromResolution,
} from '../../../utils/videoHelpers';
import { NavRow, ToggleRow } from './rows';
import { MENU_ICON_SIZE, menuIconBoxSx } from './styles';
import type { AutoSkipSettings, MenuPage } from './types';

interface MainPageProps {
  qualityOptions: Array<{ label: string; value: string }>;
  selectedQuality: string;
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
}: MainPageProps) {
  const qualityTag = getQualityTagFromResolution(selectedQuality);
  const qualityColor = qualityTag ? getQualityTagColor(qualityTag) : '#7C3AED';
  const activeSkips = Object.values(autoSkipSettings).filter(Boolean).length;

  return (
    <Box>
      <NavRow
        icon={<Box sx={menuIconBoxSx(qualityColor)}>{qualityTag || '—'}</Box>}
        title="Качество"
        value={
          qualityOptions.find((q) => q.value === selectedQuality)?.label ||
          'Авто'
        }
        onClick={() => onNavigate('quality')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx('#A855F7')}>
            <SpeedOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Скорость"
        value={`${playbackRate}x`}
        onClick={() => onNavigate('speed')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx('#BB86FC')}>
            <FastForwardOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Перемотка"
        value={skipManager.formatSkipTime()}
        onClick={() => onNavigate('skip')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx('#C084FC')}>
            <SkipNextOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
          </Box>
        }
        title="Автопропуск"
        value={`${activeSkips} активных`}
        onClick={() => onNavigate('autoSkip')}
      />

      <NavRow
        icon={
          <Box sx={menuIconBoxSx('#9F7AEA')}>
            <SubtitlesOutlined sx={{ fontSize: MENU_ICON_SIZE }} />
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
};

export default MainPage;
