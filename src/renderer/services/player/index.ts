/**
 * Video Player Services
 * ООП-архитектура для управления видеоплеером
 */

export { ShakaPlayerManager } from './ShakaPlayerManager';
export type { QualityOption, ShakaPlayerConfig } from './ShakaPlayerManager';

export { VideoStateManager } from './VideoStateManager';
export type { VideoState, VideoStateConfig } from './VideoStateManager';

export { QualityManager } from './QualityManager';
export type { QualityManagerConfig } from './QualityManager';

export { KeyboardManager } from './KeyboardManager';
export type { KeyboardManagerConfig } from './KeyboardManager';

export { UIStateManager } from './UIStateManager';
export type { UIState, UIStateConfig } from './UIStateManager';

export { SkipManager } from './SkipManager';
export type { SkipManagerConfig } from './SkipManager';

export { VideoPlayerController } from './VideoPlayerController';
export type {
  VideoPlayerControllerConfig,
  PlayerLoadOptions,
} from './VideoPlayerController';

export { PlayerSelectionManager } from './PlayerSelectionManager';
export type {
  PlayerPreferences,
  StateUpdateCallbacks,
} from './PlayerSelectionManager';

export { BookmarkManager } from './BookmarkManager';
export type { BookmarkManagerConfig } from './BookmarkManager';

export { CommentsManager } from './CommentsManager';
export type {
  CommentsManagerConfig,
  Comment,
  CommentsPaginationState,
} from './CommentsManager';

export { ThumbnailManager } from './ThumbnailManager';

export { UIStateManager } from './UIStateManager';
export type { UIState } from './UIStateManager';

export { AutoplayManager } from './AutoplayManager';
export type { AutoplayConfig } from './AutoplayManager';

export { SegmentManager } from './SegmentManager';
export type { TimeCodeSegment, SegmentSettings } from './SegmentManager';
