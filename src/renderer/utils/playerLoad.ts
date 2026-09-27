/**
 * Вид загрузки источника в плеер: первая, смена источника в серии или смена серии
 */

export type PlayerLoadKind = 'initial' | 'source' | 'episode';

export interface PlayerLoadState {
  isInitialLoad: boolean;
  lastEpisodeId: number | null;
  episodeId: number | null | undefined;
}

/**
 * Смена озвучки или плеера в той же серии — «source»: время и состояние
 * воспроизведения сохраняются. Любая другая загрузка после первой — «episode»
 */
export function classifyPlayerLoad({
  isInitialLoad,
  lastEpisodeId,
  episodeId,
}: PlayerLoadState): PlayerLoadKind {
  if (isInitialLoad) return 'initial';

  const sameEpisode =
    lastEpisodeId !== null &&
    episodeId !== null &&
    episodeId !== undefined &&
    lastEpisodeId === episodeId;

  return sameEpisode ? 'source' : 'episode';
}

/**
 * Время, с которого продолжить после смены источника; null — с начала
 */
export function getResumeTime(currentTime: number): number | null {
  return Number.isFinite(currentTime) && currentTime > 0 ? currentTime : null;
}
