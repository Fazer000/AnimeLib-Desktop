import { Box } from '@mui/material';
import { SpeedOutlined } from '@mui/icons-material';
import { OptionRow, PageHeader } from './rows';
import { MENU_ICON_SIZE } from './styles';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface SpeedPageProps {
  playbackRate: number;
  onSelect: (rate: number) => void;
  onBack: () => void;
}

/** Выбор скорости воспроизведения. */
function SpeedPage({ playbackRate, onSelect, onBack }: SpeedPageProps) {
  return (
    <Box>
      <PageHeader title="Скорость" onBack={onBack} />

      {SPEEDS.map((speed) => {
        const selected = speed === playbackRate;

        return (
          <OptionRow
            key={speed}
            label={`${speed}x`}
            selected={selected}
            onSelect={() => onSelect(speed)}
            leading={
              <SpeedOutlined
                sx={{
                  fontSize: MENU_ICON_SIZE,
                  color: selected ? '#BB86FC' : '#A855F7',
                  opacity: 0.7,
                }}
              />
            }
          />
        );
      })}
    </Box>
  );
}

export default SpeedPage;
