/**
 * Сборка Episode[] и Player[] из локального каталога
 */
import { Episode, Player } from '../../api/animeApi';
import {
  OfflineAnime,
  OfflineContinueItem,
  OfflineEpisode,
  buildOfflineUrl,
} from '../../../constants';
import { offlineStore } from './OfflineStore';
import { progressStore } from './ProgressStore';

/**
 * Приводит скачанную серию к формату API
 */
const toEpisode = (item: OfflineEpisode): Episode => ({
  id: item.episodeId,
  model: 'episode',
  name: item.episodeName,
  number: item.episodeNumber,
  number_secondary: '',
  season: item.season,
  status: { id: 'offline', label: 'Скачано', abbr: null },
  anime_id: 0,
  created_at: item.createdAt,
  item_number: parseFloat(item.episodeNumber) || 0,
  type: 'offline',
});

/**
 * Приводит скачанную серию к формату плеера
 */
const toPlayer = (item: OfflineEpisode): Player => ({
  id: item.playerId,
  episode_id: item.episodeId,
  player: item.playerType,
  translation_type: {
    id: item.translationTypeId,
    label: item.translationLabel,
  },
  team: {
    id: item.teamId,
    slug: '',
    slug_url: '',
    model: 'team',
    name: item.teamName,
    cover: { filename: null, thumbnail: '', default: '', md: '' },
    stats: [],
  },
  created_at: item.createdAt,
  is_viewed: false,
  views: 0,
  timecode: (item.timecode as any[]) || [],
  subtitles: item.subtitles.map((subtitle, index) => ({
    id: index + 1,
    format: subtitle.format,
    name: subtitle.name,
    filename: subtitle.fileName,
    src: buildOfflineUrl(subtitle.fileName),
  })),
});

class OfflineCatalog {
  /**
   * Возвращает запись аниме из каталога
   */
  // eslint-disable-next-line class-methods-use-this
  public getAnime(animeId: string): OfflineAnime | null {
    return (
      offlineStore
        .getSnapshot()
        .anime.find((item) => item.animeId === animeId) || null
    );
  }

  /**
   * Возвращает уникальные скачанные серии аниме
   */
  public getEpisodes(animeId: string): Episode[] {
    const entry = this.getAnime(animeId);

    if (!entry) {
      return [];
    }

    const unique = new Map<number, OfflineEpisode>();
    entry.episodes.forEach((item) => {
      if (!unique.has(item.episodeId)) {
        unique.set(item.episodeId, item);
      }
    });

    return Array.from(unique.values())
      .sort((a, b) => parseFloat(a.episodeNumber) - parseFloat(b.episodeNumber))
      .map(toEpisode);
  }

  /**
   * Возвращает синтетические плееры серии
   */
  public getPlayers(animeId: string, episodeId: number): Player[] {
    const entry = this.getAnime(animeId);

    if (!entry) {
      return [];
    }

    const unique = new Map<number, OfflineEpisode>();
    entry.episodes
      .filter((item) => item.episodeId === episodeId)
      .forEach((item) => {
        if (!unique.has(item.playerId)) {
          unique.set(item.playerId, item);
        }
      });

    return Array.from(unique.values()).map(toPlayer);
  }

  /**
   * Возвращает недосмотренные серии, доступные локально
   */
  public getContinueItems(): OfflineContinueItem[] {
    const seen = new Set<string>();

    return Object.values(progressStore.getAll())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((item) => {
        if (seen.has(item.animeId)) {
          return false;
        }

        seen.add(item.animeId);
        return true;
      })
      .map((item) => {
        const entry = this.getAnime(item.animeId);
        const episode = entry?.episodes.find(
          (candidate) => candidate.episodeId === item.episodeId,
        );

        if (!entry || !episode) {
          return null;
        }

        return {
          animeId: entry.animeId,
          title: entry.title,
          episodeId: episode.episodeId,
          episodeNumber: episode.episodeNumber,
          coverFileName: entry.coverFileName,
        };
      })
      .filter(Boolean) as OfflineContinueItem[];
  }

  /**
   * Возвращает локальную ссылку на обложку
   */
  // eslint-disable-next-line class-methods-use-this
  public getCoverUrl(entry: OfflineAnime): string {
    return entry.coverFileName ? buildOfflineUrl(entry.coverFileName) : '';
  }
}

// eslint-disable-next-line import/prefer-default-export
export const offlineCatalog = new OfflineCatalog();
