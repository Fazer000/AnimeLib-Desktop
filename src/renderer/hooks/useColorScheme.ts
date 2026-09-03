import { useEffect, useState } from 'react';
import { ColorSchemeName } from '../theme/themeMode';
import { themeModeStore } from '../services/theme';

/**
 * Держит текущую цветовую схему в актуальном состоянии
 */
function useColorScheme(): ColorSchemeName {
  const [scheme, setScheme] = useState<ColorSchemeName>(() =>
    themeModeStore.getScheme(),
  );

  useEffect(() => themeModeStore.subscribe((next) => setScheme(next)), []);

  return scheme;
}

export default useColorScheme;
