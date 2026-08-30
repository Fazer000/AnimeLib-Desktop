import { Box, Divider, Typography } from '@mui/material';
import { SubtitleTrack, SubtitlesSettings } from '../../../services/player';
import { SubtitleStyleSettings } from '../../../utils/subtitleHelpers';
import {
  SUBTITLES_FONT_SCALES,
  SUBTITLES_OFFSETS,
  SUBTITLES_OUTLINE_MODES,
} from '../../../../constants';
import { ChipGroup, OptionRow, PageHeader } from './rows';
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
  return (
    <Box sx={{ minWidth: 240 }}>
      <PageHeader title="Субтитры" onBack={onBack} />

      {tracks.length === 0 && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            px: 1.5,
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

      <Box sx={{ px: 1.5, py: 1 }}>
        <ChipGroup
          label="Размер"
          options={[...SUBTITLES_FONT_SCALES]}
          getKey={(scale) => scale}
          getLabel={(scale) => `${scale}x`}
          isSelected={(scale) => settings.fontScale === scale}
          onSelect={(scale) => onSettingsChange?.({ fontScale: scale })}
          chipSx={CHIP_SX}
          mb={1.5}
        />

        <ChipGroup
          label="Фон и обводка"
          options={[...SUBTITLES_OUTLINE_MODES]}
          getKey={(mode) => mode.value}
          getLabel={(mode) => mode.label}
          isSelected={(mode) => settings.outline === mode.value}
          onSelect={(mode) => onSettingsChange?.({ outline: mode.value })}
          chipSx={CHIP_SX}
          mb={1.5}
        />

        <ChipGroup
          label="Смещение вверх"
          options={[...SUBTITLES_OFFSETS]}
          getKey={(offset) => offset}
          getLabel={(offset) => offset}
          isSelected={(offset) => settings.offsetY === offset}
          onSelect={(offset) => onSettingsChange?.({ offsetY: offset })}
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
