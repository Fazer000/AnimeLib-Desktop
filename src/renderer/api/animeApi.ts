import axios, { isAxiosError } from 'axios';

import { createLogger } from '../../shared/logger';
import { QUICK_BOOKMARK_STATUSES } from '../../constants';
import { mergeBookmarkLists } from '../utils/quickBookmarks';
import { toAnimeBookmarkItems } from '../utils/folderBookmarks';
import {
  filterAnimeFolders,
  resolveProgressStatus,
} from '../utils/bookmarkFolders';
import type { AnimeSubscriptionItem } from '../utils/animeSubscriptions';
import { buildTitleAction } from '../utils/titleAction';
import {
  RateLimitCooldown,
  RateLimitInfo,
  withRateLimitRetry,
} from '../utils/rateLimitRetry';

const log = createLogger('AnimeAPI');

/** Ответ сервера из ошибки axios: статус и тело, если запрос дошёл. */
const errorResponse = (
  error: unknown,
): { status: number; data: unknown } | undefined => {
  if (!isAxiosError(error) || !error.response) return undefined;
  return { status: error.response.status, data: error.response.data };
};

/** Признак ответа 429 и пауза, которую просит сервер. */
const inspectRateLimit = (error: unknown): RateLimitInfo => {
  if (!isAxiosError(error) || error.response?.status !== 429) {
    return { limited: false };
  }

  const retryAfter = error.response.headers?.['retry-after'];
  return {
    limited: true,
    retryAfter: typeof retryAfter === 'string' ? retryAfter : null,
  };
};

/** Общая пауза запросов к API после ответа 429. */
const apiCooldown = new RateLimitCooldown();

/** Отрезок, который плеер умеет пропускать. */
export interface TimeCode {
  type: 'opening' | 'ending' | 'compilation' | 'splashScreen';
  from: number;
  to: number;
}

export interface Episode {
  id: number;
  model: string;
  name: string;
  number: string;
  number_secondary: string;
  season: string;
  status: {
    id: string;
    label: string;
    abbr: string | null;
  };
  anime_id: number;
  created_at: string;
  item_number: number;
  type: string;
}

export interface Player {
  id: number;
  episode_id: number;
  player: string;
  translation_type: {
    id: number;
    label: string;
  };
  team: {
    id: number;
    slug: string;
    slug_url: string;
    model: string;
    name: string;
    cover: {
      filename: string | null;
      thumbnail: string;
      default: string;
      md: string;
    };
    stats: Array<{
      value: number;
      formated: string;
      short: string;
      label: string;
      tag: string;
    }>;
  };
  created_at: string;
  is_viewed: boolean;
  views: number;
  src?: string;
  timecode: TimeCode[];
  subtitles?: Array<{
    id: number;
    format: string;
    name: string;
    filename: string;
    src: string;
  }>;
  video?: {
    id: number;
    quality: Array<{
      href: string;
      quality: number;
      bitrate: number;
    }>;
  };
}

export interface EpisodesResponse {
  data: Episode[];
}

export interface EpisodeResponse {
  data: {
    id: number;
    model: string;
    name: string;
    number: string;
    number_secondary: string;
    season: string;
    status: {
      id: string;
      label: string;
      abbr: string | null;
    };
    anime_id: number;
    created_at: string;
    players: Player[];
  };
  type: string;
}

/** Комментарий в том виде, в каком его отдаёт API. */
export interface ApiComment {
  id: number;
  comment: string;
  created_at: string;
  root_id?: number;
  parent_comment?: number;
  comment_level?: number;
  user: {
    id?: number | string;
    username: string;
    avatar: { url: string };
    premium: { enabled: boolean };
  };
  votes: { up: number; down: number };
}

/** Закладка «смотрю» из статистики пользователя. */
export interface BookmarkListItem {
  media: {
    slug_url: string;
    name?: string;
    rus_name?: string;
    cover?: { thumbnail?: string };
  };
  item?: { number?: string };
  meta?: { item_number?: number };
  updated_at?: string;
}

/** Краткая карточка тайтла в результатах поиска. */
export interface SearchResultItem {
  id: number;
  name: string;
  rus_name?: string;
  type?: { id: number; label: string };
  status?: { id: number; label: string };
  releaseDate?: string;
  releaseDateString?: string;
  cover?: { default: string };
  slug: string;
  slug_url: string;
  site?: number;
}

export interface SearchAnimeResponse {
  data: SearchResultItem[];
}

export interface KodikVideoLinks {
  success: boolean;
  data: {
    [quality: string]: Array<{
      src: string;
      type: string;
    }>;
  };
}

export interface AnimeRating {
  average: string;
  averageFormated: string;
  votes: number;
  votesFormated: string;
  user: number;
}

export interface AnimeInfo {
  id: number;
  name: string;
  rus_name: string;
  eng_name: string;
  model: string;
  slug: string;
  slug_url: string;
  cover: {
    filename: string;
    thumbnail: string;
    default: string;
    md: string;
  };
  ageRestriction: {
    id: number;
    label: string;
  };
  site: number;
  type: {
    id: number;
    label: string;
  };
  close_view: number;
  releaseDate: string;
  rating: AnimeRating;
  is_licensed: boolean;
  status: {
    id: number;
    label: string;
  };
  items_count: {
    uploaded: number;
    total: number;
  };
  releaseDateString: string;
  shikimori_href: string;
  shiki_rate: number;
}

export interface AnimeInfoResponse {
  data: AnimeInfo;
  meta: {
    country: string;
  };
}

export interface AnimeBookmark {
  id: number;
  type: string;
  media_id: number;
  item_id: number;
  progress: string;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface AnimeBookmarkResponse {
  data: AnimeBookmark | null;
}

export interface BookmarkFolder {
  id: number;
  name: string;
  color?: string | null;
  site_ids?: number[] | null;
}

export interface AnimeTeam {
  id: number;
  name: string;
  details?: { branch_id?: number | null } | null;
}

export type AnimeSubscription = AnimeSubscriptionItem;

export interface BookmarkItem {
  animeSlugUrl: string;
  title: string;
  episodeNumber: string;
  coverUrl: string | null;
}

export interface RelatedAnime {
  order: number;
  related_type: {
    id: number;
    label: string;
  };
  media: {
    id: number;
    name: string;
    rus_name: string;
    eng_name: string;
    model: string;
    slug: string;
    slug_url: string;
    cover: {
      filename: string;
      thumbnail: string;
      default: string;
      md: string;
    };
    ageRestriction: {
      id: number;
      label: string;
    };
    site: number;
    type: {
      id: number;
      label: string;
    };
    status: {
      id: number;
      label: string;
    };
    releaseDateString: string;
    shiki_rate: number | null;
  };
}

export interface RelatedAnimeResponse {
  data: RelatedAnime[];
}

const getAuthToken = (): string | null => {
  try {
    const tokenData = localStorage.getItem('animeLibAuthToken');
    if (tokenData) {
      const parsed = JSON.parse(tokenData);
      return parsed.access_token;
    }
  } catch (error) {
    log.error('Error getting auth token:', error);
  }
  return null;
};

const getBearerToken = (): string | null => {
  return getAuthToken();
};

/**
 * Возвращает id пользователя из JWT-токена
 */
const getUserId = (): string | null => {
  const token = getBearerToken();
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ? String(payload.sub) : null;
  } catch (error) {
    log.error('Error parsing user id from token:', error);
    return null;
  }
};

const animeApiClient = axios.create({
  baseURL: 'https://api.cdnlibs.org/api',
  timeout: 10000,
});

/**
 * Текущая папка тайтла; null — закладки нет или её не удалось прочитать
 */
const fetchBookmarkStatus = async (
  animeSlugUrl: string,
): Promise<number | null> => {
  try {
    const response = await animeApiClient.get(
      `/anime/${animeSlugUrl}/bookmark`,
    );
    return response.data?.data?.status ?? null;
  } catch (error) {
    if (errorResponse(error)?.status !== 404) {
      log.warn('Failed to read bookmark status:', error);
    }
    return null;
  }
};

animeApiClient.interceptors.request.use((config) => {
  const token = getBearerToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers.Accept = '*/*';
  config.headers['Accept-Language'] = 'ru,en;q=0.9,de;q=0.8,zh;q=0.7';
  config.headers['Content-Type'] = 'application/json';
  config.headers['Site-Id'] = config.headers['Site-Id'] ?? '5';
  config.headers['Client-Time-Zone'] = 'Europe/Samara';
  config.headers.Priority = 'u=1, i';

  return config;
});

const statsApiClient = axios.create({
  baseURL: 'https://hapi.hentaicdn.org/api',
  timeout: 10000,
});

statsApiClient.interceptors.request.use((config) => {
  const token = getBearerToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers.Accept = '*/*';
  config.headers['Content-Type'] = 'application/json';
  config.headers['Site-Id'] = config.headers['Site-Id'] ?? '5';
  config.headers['Client-Time-Zone'] = 'Europe/Samara';

  return config;
});

/**
 * Первая страница закладок одной папки; при сбое — пустой список
 */
const fetchBookmarksByStatus = async (
  userId: string,
  status: number,
): Promise<BookmarkListItem[]> => {
  try {
    const response = await statsApiClient.get(
      `/bookmarks?page=1&user_id=${userId}&status=${status}&sort_by=updated_at&sort_type=desc`,
    );
    const items = response.data?.data;

    return Array.isArray(items) ? items : [];
  } catch (error) {
    log.error('Failed to load bookmarks:', status, error);
    return [];
  }
};

export const animeApi = {
  /**
   * Выполнен ли вход на сайт: без него тайтлы 16+ и 18+ не находятся
   */
  isAuthorized: (): boolean => Boolean(getBearerToken()),

  getEpisodes: async (animeId: string): Promise<EpisodesResponse> => {
    log.debug('Loading episodes for anime_id:', animeId);

    const response = await animeApiClient.get(`/episodes?anime_id=${animeId}`);
    log.debug('Episodes loaded:', response.data);

    return response.data;
  },

  getEpisodePlayers: async (episodeId: number): Promise<EpisodeResponse> => {
    log.debug('Loading players for episode_id:', episodeId);

    const response = await withRateLimitRetry(
      () => animeApiClient.get(`/episodes/${episodeId}`),
      inspectRateLimit,
      { cooldown: apiCooldown },
    );
    log.debug('Players loaded:', response.data);

    return response.data;
  },

  getKodikVideoLinks: async (kodikSrc: string): Promise<KodikVideoLinks> => {
    log.debug('Loading Kodik links for src:', kodikSrc);

    const electronAPI = window.electron?.electronAPI;

    if (!electronAPI?.getKodikLinks) {
      throw new Error('[AnimeAPI] getKodikLinks IPC not available');
    }

    const result = await electronAPI.getKodikLinks(kodikSrc);

    if (!result?.success || !result.data) {
      throw new Error(result?.error || 'Failed to get Kodik links');
    }

    log.debug('Kodik links loaded successfully');
    return { success: true, data: result.data };
  },

  getAnimeInfo: async (animeId: string): Promise<AnimeInfoResponse> => {
    log.debug('Loading anime info for anime_id:', animeId);

    const fields = [
      'rate',
      'rate_avg',
      'releaseDate',
      'episodes',
      'episodes_count',
      'close_view',
      'userRating',
    ];

    const response = await animeApiClient.get(
      `/anime/${animeId}?${fields.map((field) => `fields[]=${field}`).join('&')}`,
    );
    log.debug('Anime info loaded:', response.data);

    return response.data;
  },

  getAnimeBookmark: async (
    animeSlugUrl: string,
  ): Promise<AnimeBookmarkResponse> => {
    log.debug('Loading bookmark for anime:', animeSlugUrl);

    try {
      const response = await animeApiClient.get(
        `/anime/${animeSlugUrl}/bookmark`,
      );
      log.debug('Bookmark loaded:', response.data);
      return response.data;
    } catch (error) {
      if (errorResponse(error)?.status === 404) {
        log.debug('No bookmark found for anime:', animeSlugUrl);
        return { data: null };
      }
      log.error('Error loading bookmark:', error);
      throw error;
    }
  },

  saveAnimeBookmark: async (
    animeSlugUrl: string,
    episodeId: number,
    timecode: string,
    meta: {
      team: number;
      translation_type: number;
      player: string;
      item_number: string;
    },
  ): Promise<{ success: boolean }> => {
    const status = resolveProgressStatus(
      await fetchBookmarkStatus(animeSlugUrl),
    );

    try {
      const response = await animeApiClient.post('/bookmarks', {
        media_type: 'anime',
        media_slug: animeSlugUrl,
        bookmark: {
          item_id: episodeId,
          status,
          progress: timecode,
        },
        meta,
      });
      log.debug('Закладка успешно сохранена:', response.data);
      return { success: true };
    } catch (error) {
      log.error(
        'Ошибка при сохранении закладки, пробуем создать её заново:',
        error,
      );

      try {
        await animeApiClient.post('/bookmarks', {
          media_type: 'anime',
          media_slug: animeSlugUrl,
          bookmark: {
            status,
          },
          meta: {},
        });
        const responseFinal = await animeApiClient.post('/bookmarks', {
          media_type: 'anime',
          media_slug: animeSlugUrl,
          bookmark: {
            item_id: episodeId,
            status,
            progress: timecode,
          },
          meta,
        });
        log.debug(
          'Закладка успешно сохранена после повторной попытки:',
          responseFinal.data,
        );
        return { success: true };
      } catch (retryError) {
        log.error('Ошибка при повторном сохранении закладки:', retryError);
        throw retryError;
      }
    }
  },

  /**
   * Отмечает плеер просмотренным для статистики профиля
   */
  markPlayerViewed: async (
    animeId: number,
    playerId: number,
  ): Promise<boolean> => {
    try {
      await statsApiClient.post(`/anime/${animeId}/players/${playerId}/view`);
      log.debug('Player marked as viewed:', animeId, playerId);
      return true;
    } catch (error) {
      log.error('Failed to mark player as viewed:', error);
      return false;
    }
  },

  /**
   * Ставит, меняет или удаляет (score = 0) оценку тайтла
   */
  rateAnime: async (animeId: number, score: number): Promise<AnimeRating> => {
    const response = await animeApiClient.post('/anime/rate', {
      score,
      rateable_id: animeId,
      rateable_type: 'anime',
    });
    return response.data.data;
  },

  /**
   * Папки закладок аниме текущего пользователя
   */
  getBookmarkFolders: async (): Promise<BookmarkFolder[]> => {
    const userId = getUserId();
    if (!userId) {
      return [];
    }

    const response = await animeApiClient.get(`/bookmarks/folder/${userId}`);
    return filterAnimeFolders<BookmarkFolder>(response.data?.data);
  },

  /**
   * Создаёт папку закладок
   */
  createBookmarkFolder: async (name: string): Promise<BookmarkFolder> => {
    const response = await animeApiClient.post('/bookmarks/folder', { name });
    return response.data.data;
  },

  /**
   * Переносит тайтл в папку; закладка создаётся, если её не было
   */
  setBookmarkFolder: async (
    animeSlugUrl: string,
    status: number,
  ): Promise<AnimeBookmark | null> => {
    const response = await animeApiClient.post('/bookmarks', {
      media_type: 'anime',
      media_slug: animeSlugUrl,
      bookmark: { status },
      meta: {},
    });
    return response.data?.data ?? null;
  },

  /**
   * Убирает тайтл из списков
   */
  deleteBookmark: async (bookmarkId: number): Promise<void> => {
    await animeApiClient.delete(`/bookmarks/${bookmarkId}`, {
      params: { media_type: 'anime' },
    });
  },

  /**
   * Команды перевода тайтла для подписки на выход серий
   */
  getAnimeTeams: async (animeSlugUrl: string): Promise<AnimeTeam[]> => {
    const response = await animeApiClient.get(
      `/anime/${animeSlugUrl}?fields[]=teams`,
    );
    return response.data?.data?.teams ?? [];
  },

  /**
   * Подписки пользователя на выход серий тайтла
   */
  getAnimeSubscriptions: async (
    animeSlugUrl: string,
  ): Promise<AnimeSubscription[]> => {
    const response = await animeApiClient.get(
      `/anime/${animeSlugUrl}/subscriptions`,
    );
    return response.data?.data ?? [];
  },

  /**
   * Заменяет подписки на выход серий; пустой список снимает все
   */
  saveAnimeSubscriptions: async (
    animeId: number,
    items: AnimeSubscription[],
  ): Promise<AnimeSubscription[]> => {
    const response = await animeApiClient.post(
      `/anime/${animeId}/subscriptions`,
      { items },
    );
    return response.data?.data ?? items;
  },

  /** Возвращает быстрые закладки из папок «Смотрю» и «Пересматриваю», от свежих к старым */
  getQuickBookmarks: async (limit: number = 50): Promise<BookmarkItem[]> => {
    const userId = getUserId();
    if (!userId) {
      return [];
    }

    const lists = await Promise.all(
      QUICK_BOOKMARK_STATUSES.map((status) =>
        fetchBookmarksByStatus(userId, status),
      ),
    );

    return toAnimeBookmarkItems(mergeBookmarkLists(lists, limit));
  },

  /**
   * Get episode comments
   */
  getEpisodeComments: async (
    episodeId: number,
    page: number = 1,
    sortBy: string = 'id',
    sortType: string = 'desc',
  ): Promise<{
    data: {
      replies: ApiComment[];
      root: ApiComment[];
    };
    meta: {
      has_next_page: boolean;
      page: number;
      per_page: number;
    };
  }> => {
    try {
      log.debug('Loading comments for episode:', episodeId, 'page:', page);
      const response = await animeApiClient.get('/comments', {
        params: {
          page,
          post_id: episodeId,
          post_type: 'episodes',
          sort_by: sortBy,
          sort_type: sortType,
        },
      });

      log.debug(
        'Comments loaded:',
        response.data.data.root.length,
        'root comments',
      );
      return response.data;
    } catch (error) {
      log.error('Error loading comments:', error);
      throw error;
    }
  },

  /**
   * Vote for a comment
   */
  /**
   * Возвращает id текущего пользователя
   */
  getCurrentUserId: (): string | null => getUserId(),

  /**
   * Удалить свой комментарий
   */
  deleteComment: async (commentId: number): Promise<string | null> => {
    try {
      log.debug('Deleting comment:', commentId);
      const response = await statsApiClient.delete(`/comments/${commentId}`);
      return response.data?.data?.toast?.message ?? null;
    } catch (error) {
      const response = errorResponse(error);
      log.error('Error deleting comment:', response?.status, response?.data);
      throw error;
    }
  },

  /**
   * Отредактировать свой комментарий
   */
  updateComment: async (
    commentId: number,
    comment: { type: 'doc'; content: unknown[] },
  ): Promise<ApiComment | null> => {
    try {
      log.debug('Updating comment:', commentId);
      const response = await statsApiClient.put(`/comments/${commentId}`, {
        comment,
        attachments: [],
      });
      return response.data?.data ?? null;
    } catch (error) {
      const response = errorResponse(error);
      log.error('Error updating comment:', response?.status, response?.data);
      throw error;
    }
  },

  /**
   * Добавить пользователя в игнор-лист
   */
  ignoreUser: async (
    userId: number,
    comment: string = '',
  ): Promise<unknown> => {
    const payload = {
      sourceable_type: 'user',
      sourceable_id: Number(getUserId()),
      user_id: userId,
      comment,
    };

    try {
      log.debug('Ignoring user, payload:', payload);
      const response = await statsApiClient.post('/ignore', payload);
      return response.data?.data ?? null;
    } catch (error) {
      const response = errorResponse(error);
      log.error('Error ignoring user:', response?.status, response?.data);
      throw error;
    }
  },

  voteComment: async (
    commentId: number,
    vote: 0 | 1,
  ): Promise<{ success: boolean }> => {
    try {
      log.debug('Voting for comment:', commentId, 'vote:', vote);
      const response = await animeApiClient.post(
        `/comments/${commentId}/vote`,
        {
          vote,
        },
      );

      log.debug('Vote successful:', response.data);
      return { success: true };
    } catch (error) {
      log.error('Error voting for comment:', error);
      throw error;
    }
  },

  /**
   * Submit a new comment
   */
  submitComment: async (commentData: {
    comment: {
      type: 'doc';
      content: unknown[];
    };
    post_type: 'episodes';
    post_id: number;
    parent_comment: number | null;
    root_id: number | null;
    comment_level: number;
  }): Promise<{ success: boolean; data: { data?: ApiComment } }> => {
    try {
      log.debug('Submitting comment:', commentData);
      const response = await animeApiClient.post('/comments', commentData);

      log.debug('Comment submitted successfully:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      const response = errorResponse(error);
      log.error(
        'Error submitting comment:',
        response?.status,
        response?.data,
        'payload:',
        commentData,
      );
      throw error;
    }
  },

  /**
   * Название, тип, обложка и дата выхода тайтла
   */
  getAnimeRelease: async (animeSlugUrl: string): Promise<AnimeInfo> => {
    const response = await withRateLimitRetry(
      () => animeApiClient.get(`/anime/${animeSlugUrl}?fields[]=releaseDate`),
      inspectRateLimit,
      { cooldown: apiCooldown },
    );

    return response.data.data;
  },

  /** Тайтл по slug, в том числе без числового префикса: one-piece-anime */
  findAnime: async (animeSlugUrl: string): Promise<AnimeInfo | null> => {
    try {
      return await animeApi.getAnimeRelease(animeSlugUrl);
    } catch (error) {
      if (errorResponse(error)?.status === 404) return null;
      throw error;
    }
  },

  /** Закладки одной папки на сайте сети (Site-Id) без преобразования; без входа — пустой список */
  getSiteBookmarks: async (
    siteId: number,
    status: number,
  ): Promise<unknown[]> => {
    const userId = getUserId();
    if (!userId) return [];

    const response = await statsApiClient.get(
      `/bookmarks?page=1&user_id=${userId}&status=${status}&sort_by=updated_at&sort_type=desc`,
      { headers: { 'Site-Id': String(siteId) } },
    );
    const items = response.data?.data;
    return Array.isArray(items) ? items : [];
  },

  /**
   * Выполнен ли вход: без токена закладки не загрузить
   */
  hasUser: (): boolean => getUserId() !== null,

  /**
   * Id вошедшего пользователя из токена; без входа — null
   */
  userId: (): string | null => getUserId(),

  /**
   * Get related anime
   */
  getRelatedAnime: async (
    animeSlugUrl: string,
  ): Promise<RelatedAnimeResponse> => {
    try {
      log.debug('Loading related anime for:', animeSlugUrl);
      const response = await withRateLimitRetry(
        () => animeApiClient.get(`/anime/${animeSlugUrl}/relations`),
        inspectRateLimit,
        { cooldown: apiCooldown },
      );

      log.debug('Related anime loaded:', response.data.data.length, 'items');
      return response.data;
    } catch (error) {
      log.error('Error loading related anime:', error);
      throw error;
    }
  },

  /**
   * Search anime
   */
  searchAnime: async (query: string): Promise<SearchAnimeResponse> => {
    try {
      log.debug('Searching anime:', query);

      const bearerToken = localStorage.getItem('animeLibAuthToken');
      let authToken: string | undefined;
      if (bearerToken) {
        try {
          const tokenData = JSON.parse(bearerToken);
          if (tokenData.access_token) {
            authToken = tokenData.access_token;
          }
        } catch (error) {
          log.error('Error parsing auth token:', error);
        }
      }

      const searchClient = axios.create({
        baseURL: 'https://api.cdnlibs.org/api',
        timeout: 10000,
      });

      searchClient.interceptors.request.use((config) => {
        config.headers.Accept = '*/*';
        config.headers['Accept-Language'] = 'ru,en;q=0.9,de;q=0.8,zh;q=0.7';
        config.headers['Content-Type'] = 'application/json';
        config.headers['Client-Time-Zone'] = 'Europe/Samara';
        config.headers.Priority = 'u=1, i';

        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }

        return config;
      });

      const response = await searchClient.get('/anime', {
        params: {
          'fields[]': ['rate_avg', 'rate', 'releaseDate'],
          q: query,
        },
      });

      log.debug('Search results:', response.data.data.length, 'items');
      return response.data;
    } catch (error) {
      log.error('Error searching anime:', error);
      throw error;
    }
  },

  /**
   * Поиск манги или ранобэ на сайте сети (Site-Id)
   */
  searchSiteTitles: async (
    siteId: number,
    query: string,
  ): Promise<SearchResultItem[]> => {
    const response = await animeApiClient.get('/manga', {
      params: {
        'fields[]': ['rate_avg', 'rate', 'releaseDate'],
        'site_id[]': [siteId],
        q: query,
      },
      headers: { 'Site-Id': String(siteId) },
    });
    const items = response.data?.data;
    return Array.isArray(items) ? items : [];
  },

  /**
   * Путь главы для чтения: из закладки или первая; без глав — null
   */
  getReadingPath: async (
    siteId: number,
    slugUrl: string,
  ): Promise<string | null> => {
    const headers = { 'Site-Id': String(siteId) };
    const [chapters, bookmark] = await Promise.all([
      animeApiClient.get(`/manga/${slugUrl}/chapters`, { headers }),
      getBearerToken()
        ? animeApiClient
            .get(`/manga/${slugUrl}/bookmark`, { headers })
            .catch(() => null)
        : Promise.resolve(null),
    ]);
    const items = chapters.data?.data;

    return buildTitleAction({
      watch: false,
      slug: slugUrl,
      items: Array.isArray(items) ? items : [],
      bookmarkItemId: bookmark?.data?.data?.item_id ?? null,
      userId: getUserId(),
    }).href;
  },
};

export default animeApi;
