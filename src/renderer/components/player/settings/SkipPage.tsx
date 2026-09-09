import { Box } from '@mui/material';
import { SkipManager } from '../../../services/player';
import { PageHeader } from './rows';
import SettingSlider from './SettingSlider';
import {
  SKIP_TIME_MARK_STEP,
  SKIP_TIME_MAX,
  SKIP_TIME_STEP,
} from '../../../../constants';

interface SkipPageProps {
  skipManager: SkipManager;
  onSkipTimeChange: (time: number) => void;
  onBack: () => void;
}

const MARKS = Array.from(
  { length: SKIP_TIME_MAX / SKIP_TIME_MARK_STEP + 1 },
  (unused, index) => {
    const value = index * SKIP_TIME_MARK_STEP;

    return { value, label: value === 0 ? '0' : `${value / 60} мин` };
  },
);

/** Настройка шага перемотки. */
function SkipPage({ skipManager, onSkipTimeChange, onBack }: SkipPageProps) {
  return (
    <Box>
      <PageHeader title="Время перемотки" onBack={onBack} />

      <SettingSlider
        label="Шаг"
        valueLabel={skipManager.formatSkipTime()}
        value={skipManager.getSkipTime()}
        min={0}
        max={SKIP_TIME_MAX}
        step={SKIP_TIME_STEP}
        marks={MARKS}
        onChange={(next) => {
          skipManager.setSkipTime(next);
          onSkipTimeChange(next);
        }}
      />
    </Box>
  );
}

export default SkipPage;
