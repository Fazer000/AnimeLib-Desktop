/* eslint-disable no-console */
import { animeApi } from '../../api/animeApi';

export interface Comment {
  id: number;
  comment: string;
  created_at: string;
  root_id?: number;
  parent_comment?: number;
  comment_level?: number;
  user: {
    username: string;
    avatar: {
      url: string;
    };
    premium: {
      enabled: boolean;
    };
  };
  votes: {
    up: number;
    down: number;
  };
  replies?: Comment[];
  parentUser?: string; // Username of parent comment author
}

export interface CommentsManagerConfig {
  onCommentsLoaded?: (comments: Comment[], hasMore: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (error: Error) => void;
  sortBy?: string;
  sortType?: string;
}

export interface CommentsPaginationState {
  comments: Comment[];
  page: number;
  hasMore: boolean;
  loading: boolean;
}

/**
 * CommentsManager - Управление комментариями эпизода
 *
 * Responsibilities:
 * - Загрузка комментариев с пагинацией
 * - Управление состоянием infinite scroll
 * - Форматирование даты и текста
 * - Вычисление голосов
 */
export class CommentsManager {
  private config: CommentsManagerConfig;

  private state: CommentsPaginationState = {
    comments: [],
    page: 1,
    hasMore: true,
    loading: false,
  };

  private currentEpisodeId: number | null = null;

  constructor(config: CommentsManagerConfig = {}) {
    this.config = config;
  }

  /**
   * Получить текущее состояние
   */
  public getState(): CommentsPaginationState {
    return { ...this.state };
  }

  /**
   * Обновить параметры сортировки
   */
  public updateSortOptions(sortBy: string, sortType: string): void {
    this.config.sortBy = sortBy;
    this.config.sortType = sortType;
  }

  /**
   * Связываем replies с root комментариями
   */
  private attachRepliesToComments(
    rootComments: Comment[],
    repliesData: Comment[],
  ): Comment[] {
    if (!repliesData || repliesData.length === 0) {
      return rootComments;
    }

    // Создаем карту всех комментариев (root + replies) по ID
    const commentsMap = new Map<number, Comment>();

    // Добавляем root комментарии
    rootComments.forEach((comment) => {
      commentsMap.set(comment.id, { ...comment, replies: [] });
    });

    // Добавляем replies
    repliesData.forEach((reply) => {
      commentsMap.set(reply.id, { ...reply, replies: [] });
    });

    // Связываем replies с их родителями
    repliesData.forEach((reply) => {
      const parentComment = commentsMap.get(reply.parent_comment!);
      if (parentComment) {
        // Добавляем имя пользователя родительского комментария
        const replyWithParent = {
          ...reply,
          parentUser: parentComment.user.username,
        };

        if (!parentComment.replies) {
          parentComment.replies = [];
        }
        parentComment.replies.push(replyWithParent);
      }
    });

    // Возвращаем только root комментарии
    return rootComments.map((comment) => commentsMap.get(comment.id)!);
  }

  /**
   * Загрузить комментарии для эпизода
   */
  public async loadComments(
    episodeId: number,
    pageNum: number = 1,
  ): Promise<void> {
    // Если меняется эпизод, сбрасываем состояние
    if (this.currentEpisodeId !== episodeId) {
      this.reset();
      this.currentEpisodeId = episodeId;
    }

    if (this.state.loading || !this.state.hasMore) {
      return;
    }

    try {
      this.setLoading(true);
      console.log('[CommentsManager] Loading page:', pageNum);

      const response = await animeApi.getEpisodeComments(
        episodeId,
        pageNum,
        this.config.sortBy || 'id',
        this.config.sortType || 'desc',
      );
      const rootComments = response.data.root;
      const repliesData = response.data.replies;

      // Связываем replies с root комментариями
      const commentsWithReplies = this.attachRepliesToComments(
        rootComments,
        repliesData,
      );

      // Обновляем состояние
      this.state.comments =
        pageNum === 1
          ? commentsWithReplies
          : [...this.state.comments, ...commentsWithReplies];
      this.state.hasMore = response.meta.has_next_page;
      this.state.page = pageNum + 1;

      console.log(
        '[CommentsManager] Loaded comments:',
        commentsWithReplies.length,
      );

      // Уведомляем подписчиков
      this.config.onCommentsLoaded?.(this.state.comments, this.state.hasMore);
    } catch (error) {
      console.error('[CommentsManager] Error loading comments:', error);
      this.config.onError?.(error as Error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Загрузить следующую страницу
   */
  public async loadNextPage(): Promise<void> {
    if (!this.currentEpisodeId) {
      console.warn('[CommentsManager] No episode ID set');
      return;
    }

    await this.loadComments(this.currentEpisodeId, this.state.page);
  }

  /**
   * Сбросить состояние
   */
  public reset(): void {
    this.state = {
      comments: [],
      page: 1,
      hasMore: true,
      loading: false,
    };
    this.currentEpisodeId = null;
  }

  /**
   * Установить состояние загрузки
   */
  private setLoading(loading: boolean): void {
    this.state.loading = loading;
    this.config.onLoadingChange?.(loading);
  }

  /**
   * Форматировать дату комментария
   */
  public static formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Очистить HTML теги из текста
   */
  public static stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Вычислить итоговый счет голосов
   */
  public static getVoteCount(comment: Comment): number {
    return comment.votes.up - comment.votes.down;
  }

  /**
   * Получить цвет для отображения голосов
   */
  public static getVoteColor(count: number): string {
    if (count > 0) return '#4ade80'; // green
    if (count < 0) return '#f87171'; // red
    return 'inherit';
  }

  /**
   * Проверить, можно ли загружать еще комментарии
   */
  public canLoadMore(): boolean {
    return this.state.hasMore && !this.state.loading;
  }

  /**
   * Получить количество загруженных комментариев
   */
  public getCommentsCount(): number {
    return this.state.comments.length;
  }
}
