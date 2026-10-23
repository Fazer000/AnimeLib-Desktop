/**
 * Настройки улучшения картинки: режим, замер и подбор уровня в «Авто»
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { UpscaleMode, UpscalePreset } from '../../constants';
import {
  evaluateAutoWindow,
  getLowerPreset,
  getStartPreset,
  isUpscaleMode,
  isUpscalePreset,
} from '../utils/upscaleMode';
import type { UpscaleStats } from '../services/player';
import { usePersistedChoice } from './usePersistedChoice';
import { usePersistedFlag } from './usePersistedFlag';

/** 'none' — «Авто» ещё не подбирало уровень, 'off' — не тянет даже лёгкий */
type AutoPresetValue = UpscalePreset | 'none' | 'off';

const isAutoPresetValue = (value: unknown): value is AutoPresetValue =>
  value === 'none' || value === 'off' || isUpscalePreset(value);

export interface UpscaleSettingsState {
  mode: UpscaleMode;
  activePreset: UpscalePreset | null;
  showStats: boolean;
  failed: boolean;
  setMode: (mode: UpscaleMode) => void;
  setShowStats: (show: boolean) => void;
  reportStats: (stats: UpscaleStats) => void;
  reportFailure: () => void;
}

/** Выбор улучшения картинки и подбор уровня в «Авто» */
export function useUpscaleSettings(): UpscaleSettingsState {
  const [mode, setStoredMode] = usePersistedChoice<UpscaleMode>(
    'playerUpscaleMode',
    isUpscaleMode,
    'off',
  );
  const [autoPreset, setAutoPreset] = usePersistedChoice<AutoPresetValue>(
    'playerUpscaleAutoPreset',
    isAutoPresetValue,
    'none',
  );
  const [showStats, setShowStats] = usePersistedFlag(
    'playerUpscaleShowStats',
    false,
  );
  const [failed, setFailed] = useState<boolean>(false);
  const badWindowsRef = useRef<number>(0);

  const activePreset = getStartPreset(
    mode,
    autoPreset === 'none' ? null : autoPreset,
  );

  useEffect(() => {
    badWindowsRef.current = 0;
  }, [mode, activePreset]);

  const setMode = useCallback(
    (next: UpscaleMode) => {
      setFailed(false);
      if (next === 'auto') setAutoPreset('none');
      setStoredMode(next);
    },
    [setStoredMode, setAutoPreset],
  );

  const reportStats = useCallback(
    (stats: UpscaleStats) => {
      if (mode !== 'auto' || stats.bypassed) return;

      const result = evaluateAutoWindow(
        stats,
        badWindowsRef.current,
        stats.budgetMs,
      );
      badWindowsRef.current = result.badWindows;
      if (!result.stepDown) return;

      setAutoPreset(getLowerPreset(stats.preset) ?? 'off');
    },
    [mode, setAutoPreset],
  );

  const reportFailure = useCallback(() => setFailed(true), []);

  return {
    mode,
    activePreset,
    showStats,
    failed,
    setMode,
    setShowStats,
    reportStats,
    reportFailure,
  };
}

export default useUpscaleSettings;
