import { Box } from '@mui/material';
import { PageHeader } from './rows';
import SettingSlider from './SettingSlider';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface SpeedPageProps {
  playbackRate: number;
  onSelect: (rate: number) => void;
  onBack: () => void;
}

/** Выбор скорости воспроизведения. */
function SpeedPage({ playbackRate, onSelect, onBack }: SpeedPageProps) {
  const index = Math.max(0, SPEEDS.indexOf(playbackRate));

  return (
    <Box>
      <PageHeader title="Скорость" onBack={onBack} />

      <SettingSlider
        label="Текущая"
        valueLabel={`${SPEEDS[index]}x`}
        value={index}
        min={0}
        max={SPEEDS.length - 1}
        step={1}
        marks={SPEEDS.map((speed, position) => ({
          value: position,
          label: `${speed}x`,
        }))}
        onChange={(next) => onSelect(SPEEDS[next])}
      />
    </Box>
  );
}

export default SpeedPage;
