import { Box, useTheme } from '@mui/material';
import {
  getQualityTagColor,
  getQualityTagFromResolution,
} from '../../../utils/videoHelpers';
import { autoQualityCaption } from '../../../utils/autoQuality';
import { AUTO_QUALITY } from '../../../services/player';
import type { QualityModeState } from '../../../services/player';
import { OptionRow, PageHeader } from './rows';
import { qualityTagSx } from './styles';

interface QualityPageProps {
  options: Array<{ label: string; value: string }>;
  selected: string;
  mode: QualityModeState;
  onSelect: (quality: string) => void;
  onBack: () => void;
}

/** Выбор качества видео: «Авто» и качества серии. */
function QualityPage({
  options,
  selected,
  mode,
  onSelect,
  onBack,
}: QualityPageProps) {
  const { customColors } = useTheme().palette;
  const currentLabel =
    options.find((option) => option.value === selected)?.label ?? '';

  return (
    <Box>
      <PageHeader title="Качество" onBack={onBack} />

      <OptionRow
        label="Авто"
        selected={mode.auto}
        onSelect={() => onSelect(AUTO_QUALITY)}
        description={
          mode.auto ? autoQualityCaption(currentLabel, mode.reason) : ''
        }
        leading={<Box sx={qualityTagSx(customColors.onVideoColor)}>A</Box>}
      />

      {options.map((option) => {
        const tag = getQualityTagFromResolution(option.value);

        return (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={!mode.auto && option.value === selected}
            onSelect={() => onSelect(option.value)}
            leading={
              <Box sx={qualityTagSx(getQualityTagColor(tag))}>{tag}</Box>
            }
          />
        );
      })}
    </Box>
  );
}

export default QualityPage;
