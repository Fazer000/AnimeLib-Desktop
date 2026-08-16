/**
 * Сборка Episode[] и Player[] из локального каталога
 */
import { AnimeInfo, Episode, Player } from '../../api/animeApi';
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
 * Приводит скачанные копии серии к формату плеера
 */
const toPlayer = (items: OfflineEpisode[]): Player => {
  const [item] = items;
  const qualities = Array.from(
    new Set(items.map((entry) => parseInt(entry.quality, 10)).filter(Boolean)),
  ).sort((a, b) => b - a);

  return {
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
    video: qualities.length
      ? {
          id: item.playerId,
          quality: qualities.map((quality) => ({
            href: '',
            quality,
            bitrate: 0,
          })),
        }
      : undefined,
  };
};

/**
 * Приводит запись каталога к формату AnimeInfo для оверлея плеера
 */
const toAnimeInfo = (entry: OfflineAnime): AnimeInfo =>
  ({
    id: 0,
    name: entry.title,
    rus_name: entry.title,
    eng_name: '',
    model: 'anime',
    slug: '',
    slug_url: entry.animeId,
    cover: {
      filename: '',
      thumbnail: '',
      default: entry.coverFileName ? buildOfflineUrl(entry.coverFileName) : '',
      md: '',
    },
    ageRestriction: { id: 0, label: '' },
    site: 0,
    type: { id: 0, label: '' },
    close_view: 0,
    releaseDate: entry.year ? `${entry.year}-01-01` : '',
    rating: {
      average: entry.rating || '',
      averageFormated: entry.rating || '',
      votes: 0,
      votesFormated: '',
      user: 0,
    },
    is_licensed: false,
    status: { id: 0, label: '' },
    items_count: {
      uploaded: entry.episodes.length,
      total: entry.totalEpisodes || 0,
    },
    releaseDateString: entry.year ? String(entry.year) : '',
    shikimori_href: '',
    shiki_rate: 0,
  }) as AnimeInfo;

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
   * Возвращает метаданные аниме в формате AnimeInfo
   */
  public getAnimeInfo(animeId: string): AnimeInfo | null {
    const entry = this.getAnime(animeId);

    return entry ? toAnimeInfo(entry) : null;
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

    const grouped = new Map<number, OfflineEpisode[]>();
    entry.episodes
      .filter((item) => item.episodeId === episodeId)
      .forEach((item) => {
        grouped.set(item.playerId, [
          ...(grouped.get(item.playerId) || []),
          item,
        ]);
      });

    return Array.from(grouped.values()).map(toPlayer);
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
