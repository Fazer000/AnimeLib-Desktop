import type { UpscaleMode, UpscalePreset } from '../../../../constants';

export type MenuPage =
  | 'main'
  | 'upscale'
  | 'quality'
  | 'speed'
  | 'skip'
  | 'autoSkip'
  | 'subtitles';

export interface UpscaleControls {
  supported: boolean;
  mode: UpscaleMode;
  activePreset: UpscalePreset | null;
  failed: boolean;
  showStats: boolean;
  onModeChange: (mode: UpscaleMode) => void;
  onShowStatsChange: (show: boolean) => void;
}

export interface AutoSkipSettings {
  skipOpenings: boolean;
  skipEndings: boolean;
  skipCompilations: boolean;
  skipSplashScreens: boolean;
}
