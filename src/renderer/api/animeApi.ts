/* eslint-disable no-console */
import axios from 'axios';

// Интерфейсы для API
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
  timecode: any[];
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

export interface KodikVideoLinks {
  success: boolean;
  data: {
    [quality: string]: Array<{
      src: string;
      type: string;
    }>;
  };
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
  rating: {
    average: string;
    averageFormated: string;
    votes: number;
    votesFormated: string;
    user: number;
  };
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
  item_id: number; // episode_id
  progress: string; // timecode (format: "MM:SS" or "HH:MM:SS")
  status: number;
  created_at: string;
  updated_at: string;
}

export interface AnimeBookmarkResponse {
  data: AnimeBookmark | null;
}

// Получаем токен из localStorage
const getAuthToken = (): string | null => {
  try {
    const tokenData = localStorage.getItem('animeLibAuthToken');
    if (tokenData) {
      const parsed = JSON.parse(tokenData);
      return parsed.access_token;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
};

// Получаем URL сайта из localStorage
const getAnimeLibUrl = (): string => {
  try {
    const url = localStorage.getItem('animeLibUrl');
    return url || 'https://v3.animelib.org';
  } catch (error) {
    console.error('Error getting anime lib URL:', error);
    return 'https://v3.animelib.org';
  }
};

// Получаем Bearer токен
const getBearerToken = (): string | null => {
  return getAuthToken();
};

// Создаем экземпляр axios для API AnimeLib
const animeApiClient = axios.create({
  baseURL: 'https://api.cdnlibs.org/api',
  timeout: 10000,
});

// Добавляем interceptor для авторизации и заголовков
animeApiClient.interceptors.request.use((config) => {
  const token = getBearerToken();
  const animeLibUrl = getAnimeLibUrl();

  // Добавляем авторизацию
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Добавляем общие заголовки
  config.headers.Accept = '*/*';
  config.headers['Accept-Language'] = 'ru,en;q=0.9,de;q=0.8,zh;q=0.7';
  config.headers['Content-Type'] = 'application/json';
  config.headers.Origin = animeLibUrl;
  config.headers.Referer = animeLibUrl;
  config.headers['Sec-Ch-Ua'] =
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
  config.headers['Sec-Ch-Ua-Mobile'] = '?1';
  config.headers['Sec-Ch-Ua-Platform'] = '"Android"';
  config.headers['Sec-Fetch-Dest'] = 'empty';
  config.headers['Sec-Fetch-Mode'] = 'cors';
  config.headers['Sec-Fetch-Site'] = 'cross-site';
  config.headers['Site-Id'] = '5';
  config.headers['User-Agent'] =
    'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
  config.headers['Client-Time-Zone'] = 'Europe/Samara';
  config.headers.Priority = 'u=1, i';

  return config;
});

// Создаем экземпляр axios для Kodik API
const kodikApiClient = axios.create({
  baseURL: 'https://anilib-kodik-api.burntv.ru/api',
  timeout: 10000, // Увеличиваем таймаут до 30 секунд
});

// Добавляем interceptor для заголовков Kodik API
kodikApiClient.interceptors.request.use((config) => {
  // Добавляем общие заголовки
  config.headers.Accept = '*/*';
  config.headers['Accept-Language'] = 'ru,en;q=0.9,de;q=0.8,zh;q=0.7';
  config.headers['Content-Type'] = 'application/json';
  config.headers['Site-Id'] = '5';
  config.headers['Client-Time-Zone'] = 'Europe/Samara';
  config.headers.Priority = 'u=1, i';

  return config;
});

// API функции
export const animeApi = {
  // Получить список эпизодов аниме
  getEpisodes: async (animeId: string): Promise<EpisodesResponse> => {
    console.log('[AnimeAPI] Loading episodes for anime_id:', animeId);

    const response = await animeApiClient.get(`/episodes?anime_id=${animeId}`);
    console.log('[AnimeAPI] Episodes loaded:', response.data);

    return response.data;
  },

  // Получить плееры для эпизода
  getEpisodePlayers: async (episodeId: number): Promise<EpisodeResponse> => {
    console.log('[AnimeAPI] Loading players for episode_id:', episodeId);

    const response = await animeApiClient.get(`/episodes/${episodeId}`);
    console.log('[AnimeAPI] Players loaded:', response.data);

    return response.data;
  },

  // Получить прямые ссылки на видео от Kodik
  getKodikVideoLinks: async (kodikSrc: string): Promise<KodikVideoLinks> => {
    console.log('[AnimeAPI] Loading Kodik links for src:', kodikSrc);

    const maxRetries = 3;
    let lastError: any;

    const makeRequest = async (attempt: number): Promise<KodikVideoLinks> => {
      try {
        console.log(
          `[AnimeAPI] Kodik request attempt ${attempt}/${maxRetries}`,
        );

        const response = await kodikApiClient.get(
          `/video-links?link=${encodeURIComponent(kodikSrc)}`,
        );
        console.log('[AnimeAPI] Kodik links loaded:', response.data);

        return response.data;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[AnimeAPI] Kodik request attempt ${attempt} failed:`,
          error.message,
        );

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s, 6s
          console.log(`[AnimeAPI] Retrying in ${delay}ms...`);
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), delay);
          });
          return makeRequest(attempt + 1);
        }
        throw error;
      }
    };

    try {
      return await makeRequest(1);
    } catch {
      console.error('[AnimeAPI] All Kodik request attempts failed:', lastError);
      throw lastError;
    }
  },

  // Получить информацию об аниме
  getAnimeInfo: async (animeId: string): Promise<AnimeInfoResponse> => {
    console.log('[AnimeAPI] Loading anime info for anime_id:', animeId);

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
    console.log('[AnimeAPI] Anime info loaded:', response.data);

    return response.data;
  },

  // Получить закладку аниме (текущий эпизод и таймкод)
  getAnimeBookmark: async (
    animeSlugUrl: string,
  ): Promise<AnimeBookmarkResponse> => {
    console.log('[AnimeAPI] Loading bookmark for anime:', animeSlugUrl);

    try {
      const response = await animeApiClient.get(
        `/anime/${animeSlugUrl}/bookmark`,
      );
      console.log('[AnimeAPI] Bookmark loaded:', response.data);
      return response.data;
    } catch (error: any) {
      // Если закладки нет (404), возвращаем null
      if (error.response && error.response.status === 404) {
        console.log('[AnimeAPI] No bookmark found for anime:', animeSlugUrl);
        return { data: null };
      }
      console.error('[AnimeAPI] Error loading bookmark:', error);
      throw error;
    }
  },

  // Сохранить закладку аниме (эпизод и таймкод)
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
    try {
      const response = await animeApiClient.post('/bookmarks', {
        media_type: 'anime',
        media_slug: animeSlugUrl,
        bookmark: {
          item_id: episodeId,
          status: 21,
          progress: timecode,
        },
        meta,
      });
      console.log('[AnimeAPI] Закладка успешно сохранена:', response.data);
      return { success: true };
    } catch (error: any) {
      console.error(
        '[AnimeAPI] Ошибка при сохранении закладки (status 21), пробуем с другим статусом:',
        error,
      );

      // Пробуем повторно с другим статусом (22)
      try {
        await animeApiClient.post('/bookmarks', {
          media_type: 'anime',
          media_slug: animeSlugUrl,
          bookmark: {
            status: 21,
          },
          meta: {},
        });
        // После успешной попытки пробуем снова сохранить с нужными параметрами
        const responseFinal = await animeApiClient.post('/bookmarks', {
          media_type: 'anime',
          media_slug: animeSlugUrl,
          bookmark: {
            item_id: episodeId,
            status: 21,
            progress: timecode,
          },
          meta,
        });
        console.log(
          '[AnimeAPI] Закладка успешно сохранена после повторной попытки:',
          responseFinal.data,
        );
        return { success: true };
      } catch (retryError: any) {
        console.error(
          '[AnimeAPI] Ошибка при повторном сохранении закладки:',
          retryError,
        );
        throw retryError;
      }
    }
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
      replies: Array<any>;
      root: Array<any>;
    };
    meta: {
      has_next_page: boolean;
      page: number;
      per_page: number;
    };
  }> => {
    try {
      console.log(
        '[AnimeAPI] Loading comments for episode:',
        episodeId,
        'page:',
        page,
      );
      const response = await animeApiClient.get('/comments', {
        params: {
          page,
          post_id: episodeId,
          post_type: 'episodes',
          sort_by: sortBy,
          sort_type: sortType,
        },
      });

      console.log(
        '[AnimeAPI] Comments loaded:',
        response.data.data.root.length,
        'root comments',
      );
      return response.data;
    } catch (error) {
      console.error('[AnimeAPI] Error loading comments:', error);
      throw error;
    }
  },

  /**
   * Vote for a comment
   */
  voteComment: async (
    commentId: number,
    vote: 0 | 1,
  ): Promise<{ success: boolean }> => {
    try {
      console.log('[AnimeAPI] Voting for comment:', commentId, 'vote:', vote);
      const response = await animeApiClient.post(
        `/comments/${commentId}/vote`,
        {
          vote,
        },
      );

      console.log('[AnimeAPI] Vote successful:', response.data);
      return { success: true };
    } catch (error) {
      console.error('[AnimeAPI] Error voting for comment:', error);
      throw error;
    }
  },
};

export default animeApi;
