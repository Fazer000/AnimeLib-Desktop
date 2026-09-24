export type MenuPage =
  | 'main'
  | 'quality'
  | 'speed'
  | 'skip'
  | 'autoSkip'
  | 'subtitles';

export interface UpscaleControls {
  enabled: boolean;
  compare: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onCompareChange: (compare: boolean) => void;
}

export interface AutoSkipSettings {
  skipOpenings: boolean;
  skipEndings: boolean;
  skipCompilations: boolean;
  skipSplashScreens: boolean;
}
