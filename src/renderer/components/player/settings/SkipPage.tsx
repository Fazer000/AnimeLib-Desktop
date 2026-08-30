import { Box, Typography } from '@mui/material';
import { SkipManager } from '../../../services/player';
import { ChipGroup, PageHeader } from './rows';
import { CHIP_QUARTER_SX, CHIP_THIRD_SX } from './styles';
import { ACCENT_LIGHT } from '../../../theme/palette';

const MINUTES = [0, 1, 2, 3, 4, 5];
const SECONDS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface SkipPageProps {
  skipManager: SkipManager;
  onSkipTimeChange: (time: number) => void;
  onBack: () => void;
}

/** Настройка шага перемотки. */
function SkipPage({ skipManager, onSkipTimeChange, onBack }: SkipPageProps) {
  return (
    <Box>
      <PageHeader title="Время перемотки" onBack={onBack} />

      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <ChipGroup
          label="Минуты"
          options={MINUTES}
          getKey={(min) => min}
          getLabel={(min) => min}
          isSelected={(min) => skipManager.getMinutes() === min}
          onSelect={(min) => {
            skipManager.setMinutes(min);
            onSkipTimeChange(skipManager.getSkipTime());
          }}
          chipSx={CHIP_THIRD_SX}
          wrap
          mb={1}
        />
      </Box>

      <Box sx={{ px: 1.5, py: 0.5 }}>
        <ChipGroup
          label="Секунды"
          options={SECONDS}
          getKey={(sec) => sec}
          getLabel={(sec) => sec}
          isSelected={(sec) => skipManager.getSeconds() === sec}
          onSelect={(sec) => {
            skipManager.setSeconds(sec);
            onSkipTimeChange(skipManager.getSkipTime());
          }}
          chipSx={CHIP_QUARTER_SX}
          wrap
          mb={1}
        />
      </Box>

      <Box
        sx={{
          mx: 1.5,
          mb: 1,
          backgroundColor: 'rgba(124, 58, 237, 0.2)',
          borderRadius: 1,
          px: 1.5,
          py: 1,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: ACCENT_LIGHT,
            fontWeight: 600,
            fontFamily: 'Roboto, sans-serif',
          }}
        >
          {skipManager.formatSkipTime()}
        </Typography>
      </Box>
    </Box>
  );
}

export default SkipPage;
