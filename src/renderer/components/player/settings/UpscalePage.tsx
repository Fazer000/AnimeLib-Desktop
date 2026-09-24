import { Box, Divider, Typography } from '@mui/material';
import { UPSCALE_MODES } from '../../../../constants';
import {
  getUpscaleModeDescription,
  getUpscaleModeLabel,
} from '../../../utils/upscaleMode';
import { OptionRow, PageHeader, ToggleRow } from './rows';
import { CAPTION_BLOCK_SX } from './styles';
import type { UpscaleControls } from './types';

interface UpscalePageProps {
  controls: UpscaleControls;
  onBack: () => void;
}

/** Выбор уровня улучшения картинки и показ замера нагрузки. */
function UpscalePage({ controls, onBack }: UpscalePageProps) {
  return (
    <Box>
      <PageHeader title="Повышение качества" onBack={onBack} />

      {!controls.supported && (
        <Typography
          variant="caption"
          sx={{ ...CAPTION_BLOCK_SX, whiteSpace: 'normal', px: 2.5, py: 1.5 }}
        >
          Видеокарта или её драйвер не поддерживают эту функцию
        </Typography>
      )}

      {controls.supported &&
        UPSCALE_MODES.map((mode) => (
          <OptionRow
            key={mode}
            label={getUpscaleModeLabel(mode)}
            description={getUpscaleModeDescription(mode)}
            selected={controls.mode === mode}
            onSelect={() => controls.onModeChange(mode)}
          />
        ))}

      {controls.supported && controls.mode !== 'off' && (
        <>
          <Divider />
          <ToggleRow
            title="Показывать нагрузку"
            checked={controls.showStats}
            onChange={controls.onShowStatsChange}
          />
        </>
      )}
    </Box>
  );
}

export default UpscalePage;
