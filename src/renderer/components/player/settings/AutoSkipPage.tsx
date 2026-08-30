import { Box } from '@mui/material';
import { PageHeader, ToggleRow } from './rows';
import { SWITCH_SKIP_SX } from './styles';
import type { AutoSkipSettings } from './types';

const TOGGLES: Array<{ key: keyof AutoSkipSettings; title: string }> = [
  { key: 'skipOpenings', title: 'Пропускать опенинги' },
  { key: 'skipEndings', title: 'Пропускать эндинги' },
  { key: 'skipCompilations', title: 'Пропускать компиляции' },
  { key: 'skipSplashScreens', title: 'Пропускать заставки' },
];

interface AutoSkipPageProps {
  settings: AutoSkipSettings;
  onChange?: (settings: AutoSkipSettings) => void;
  onBack: () => void;
}

/** Настройки автоматического пропуска сегментов. */
function AutoSkipPage({ settings, onChange, onBack }: AutoSkipPageProps) {
  return (
    <Box>
      <PageHeader title="Автоматический пропуск" onBack={onBack} />

      {TOGGLES.map(({ key, title }) => (
        <ToggleRow
          key={key}
          title={title}
          checked={settings[key]}
          onChange={(checked) => onChange?.({ ...settings, [key]: checked })}
          switchSx={SWITCH_SKIP_SX}
        />
      ))}
    </Box>
  );
}

AutoSkipPage.defaultProps = { onChange: undefined };

export default AutoSkipPage;
