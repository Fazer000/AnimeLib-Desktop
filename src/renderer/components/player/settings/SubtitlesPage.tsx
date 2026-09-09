import { Box, Divider, Typography } from '@mui/material';
import { SubtitleTrack, SubtitlesSettings } from '../../../services/player';
import { SubtitleStyleSettings } from '../../../utils/subtitleHelpers';
import {
  SETTINGS_MENU_PADDING_X,
  SUBTITLES_FONT_SCALES,
  SUBTITLES_OFFSETS,
  SUBTITLES_OUTLINE_MODES,
} from '../../../../constants';
import { ChipGroup, OptionRow, PageHeader } from './rows';
import SettingSlider from './SettingSlider';
import { CHIP_SX } from './styles';

const OFF_TRACK: SubtitleTrack = { id: -1, name: '' } as SubtitleTrack;

interface SubtitlesPageProps {
  tracks: SubtitleTrack[];
  settings: SubtitlesSettings;
  onTrackChange?: (trackName: string | null) => void;
  onSettingsChange?: (patch: Partial<SubtitleStyleSettings>) => void;
  onBack: () => void;
}

/** Выбор дорожки субтитров и их оформления. */
function SubtitlesPage({
  tracks,
  settings,
  onTrackChange,
  onSettingsChange,
  onBack,
}: SubtitlesPageProps) {
  const scaleIndex = Math.max(
    0,
    SUBTITLES_FONT_SCALES.indexOf(settings.fontScale),
  );
  const offsetIndex = Math.max(0, SUBTITLES_OFFSETS.indexOf(settings.offsetY));

  return (
    <Box sx={{ minWidth: 240 }}>
      <PageHeader title="Субтитры" onBack={onBack} />

      {tracks.length === 0 && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: SETTINGS_MENU_PADDING_X,
            py: 1,
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '11px',
          }}
        >
          У выбранной озвучки нет субтитров
        </Typography>
      )}

      {tracks.length > 0 &&
        [OFF_TRACK, ...tracks].map((track) => {
          const trackName = track.name || null;

          return (
            <OptionRow
              key={track.id}
              label={trackName || 'Выключить'}
              selected={settings.trackName === trackName}
              onSelect={() => onTrackChange?.(trackName)}
              highlightSelected={false}
              noWrapLabel
            />
          );
        })}

      <Divider />

      <SettingSlider
        label="Размер"
        valueLabel={`${SUBTITLES_FONT_SCALES[scaleIndex]}x`}
        value={scaleIndex}
        min={0}
        max={SUBTITLES_FONT_SCALES.length - 1}
        step={1}
        marks={SUBTITLES_FONT_SCALES.map((scale, position) => ({
          value: position,
          label: `${scale}x`,
        }))}
        onChange={(next) =>
          onSettingsChange?.({ fontScale: SUBTITLES_FONT_SCALES[next] })
        }
      />

      <SettingSlider
        label="Смещение вверх"
        valueLabel={`${SUBTITLES_OFFSETS[offsetIndex]}`}
        value={offsetIndex}
        min={0}
        max={SUBTITLES_OFFSETS.length - 1}
        step={1}
        marks={SUBTITLES_OFFSETS.map((offset, position) => ({
          value: position,
          label: `${offset}`,
        }))}
        onChange={(next) =>
          onSettingsChange?.({ offsetY: SUBTITLES_OFFSETS[next] })
        }
      />

      <Box sx={{ px: SETTINGS_MENU_PADDING_X, py: 1 }}>
        <ChipGroup
          label="Фон и обводка"
          options={[...SUBTITLES_OUTLINE_MODES]}
          getKey={(mode) => mode.value}
          getLabel={(mode) => mode.label}
          isSelected={(mode) => settings.outline === mode.value}
          onSelect={(mode) => onSettingsChange?.({ outline: mode.value })}
          chipSx={CHIP_SX}
        />
      </Box>
    </Box>
  );
}

SubtitlesPage.defaultProps = {
  onTrackChange: undefined,
  onSettingsChange: undefined,
};

export default SubtitlesPage;
