export type MenuPage =
  | 'main'
  | 'quality'
  | 'speed'
  | 'skip'
  | 'autoSkip'
  | 'subtitles';

export interface AutoSkipSettings {
  skipOpenings: boolean;
  skipEndings: boolean;
  skipCompilations: boolean;
  skipSplashScreens: boolean;
}
