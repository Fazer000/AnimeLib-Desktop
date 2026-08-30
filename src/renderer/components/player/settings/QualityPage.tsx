import { Box } from '@mui/material';
import {
  getQualityTagColor,
  getQualityTagFromResolution,
} from '../../../utils/videoHelpers';
import { OptionRow, PageHeader } from './rows';
import { qualityTagSx } from './styles';

interface QualityPageProps {
  options: Array<{ label: string; value: string }>;
  selected: string;
  onSelect: (quality: string) => void;
  onBack: () => void;
}

/** Выбор качества видео. */
function QualityPage({
  options,
  selected,
  onSelect,
  onBack,
}: QualityPageProps) {
  return (
    <Box>
      <PageHeader title="Качество" onBack={onBack} />

      {options.map((option) => {
        const tag = getQualityTagFromResolution(option.value);

        return (
          <OptionRow
            key={option.value}
            label={option.label}
            selected={option.value === selected}
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
