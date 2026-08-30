import { animeApi } from '../../api/animeApi';

import { createLogger } from '../../../shared/logger';
import { DANGER_SOFT, SUCCESS } from '../../theme/palette';

const log = createLogger('CommentsManager');

export interface Comment {
  id: number;
  comment: string;
  created_at: string;
  root_id?: number;
  parent_comment?: number;
  comment_level?: number;
  user: {
    id?: number | string;
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
  parentUser?: string;
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

  private rootsRaw: Comment[] = [];

  private repliesRaw: Comment[] = [];

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
   * Объединяет списки комментариев без дублей, сохраняя порядок
   */
  private static mergeById(current: Comment[], incoming: Comment[]): Comment[] {
    const known = new Set(current.map((comment) => comment.id));
    return [
      ...current,
      ...incoming.filter((comment) => {
        if (known.has(comment.id)) return false;
        known.add(comment.id);
        return true;
      }),
    ];
  }

  /**
   * Собирает дерево комментариев произвольной вложенности
   */
  public static buildTree(
    rootComments: Comment[],
    repliesData: Comment[],
  ): Comment[] {
    const nodes = new Map<number, Comment>();

    [...rootComments, ...repliesData].forEach((comment) => {
      nodes.set(comment.id, { ...comment, replies: [] });
    });

    [...repliesData]
      .sort((a, b) => a.id - b.id)
      .forEach((reply) => {
        const node = nodes.get(reply.id);
        const parent =
          nodes.get(reply.parent_comment ?? -1) ??
          nodes.get(reply.root_id ?? -1);

        if (!node || !parent || parent.id === node.id) return;

        node.parentUser = parent.user.username;
        parent.replies!.push(node);
      });

    return rootComments
      .map((comment) => nodes.get(comment.id))
      .filter((comment): comment is Comment => Boolean(comment));
  }

  /**
   * Загрузить комментарии для эпизода
   */
  public async loadComments(
    episodeId: number,
    pageNum: number = 1,
  ): Promise<void> {
    if (this.currentEpisodeId !== episodeId) {
      this.reset();
      this.currentEpisodeId = episodeId;
    }

    if (this.state.loading || !this.state.hasMore) {
      return;
    }

    try {
      this.setLoading(true);
      log.debug('Loading page:', pageNum);

      const response = await animeApi.getEpisodeComments(
        episodeId,
        pageNum,
        this.config.sortBy || 'id',
        this.config.sortType || 'desc',
      );
      if (pageNum === 1) {
        this.rootsRaw = [];
        this.repliesRaw = [];
      }

      this.rootsRaw = CommentsManager.mergeById(
        this.rootsRaw,
        response.data.root || [],
      );
      this.repliesRaw = CommentsManager.mergeById(
        this.repliesRaw,
        response.data.replies || [],
      );

      this.state.comments = CommentsManager.buildTree(
        this.rootsRaw,
        this.repliesRaw,
      );
      this.state.hasMore = response.meta.has_next_page;
      this.state.page = pageNum + 1;

      log.debug(
        'Loaded comments:',
        this.rootsRaw.length,
        'root,',
        this.repliesRaw.length,
        'replies',
      );

      this.config.onCommentsLoaded?.(this.state.comments, this.state.hasMore);
    } catch (error) {
      log.error('Error loading comments:', error);
      this.config.onError?.(error as Error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Вставляет только что созданный комментарий в дерево без перезагрузки
   */
  public insertComment(created: Comment): void {
    const node: Comment = {
      ...created,
      votes: created.votes ?? { up: 0, down: 0 },
      created_at: created.created_at ?? new Date().toISOString(),
    };

    const isReply = Boolean(node.parent_comment);
    const known = isReply ? this.repliesRaw : this.rootsRaw;

    if (known.some((comment) => comment.id === node.id)) {
      return;
    }

    if (isReply) {
      this.repliesRaw = [...this.repliesRaw, node];
    } else {
      this.rootsRaw =
        this.config.sortType === 'asc'
          ? [...this.rootsRaw, node]
          : [node, ...this.rootsRaw];
    }

    this.state.comments = CommentsManager.buildTree(
      this.rootsRaw,
      this.repliesRaw,
    );

    log.debug('Inserted comment:', node.id, isReply ? 'as reply' : 'as root');

    this.config.onCommentsLoaded?.(this.state.comments, this.state.hasMore);
  }

  /**
   * Обновляет текст комментария после редактирования
   */
  public updateComment(updated: Comment): void {
    const patch = (list: Comment[]): Comment[] =>
      list.map((comment) =>
        comment.id === updated.id
          ? { ...comment, comment: updated.comment }
          : comment,
      );

    this.rootsRaw = patch(this.rootsRaw);
    this.repliesRaw = patch(this.repliesRaw);

    this.state.comments = CommentsManager.buildTree(
      this.rootsRaw,
      this.repliesRaw,
    );

    log.debug('Updated comment:', updated.id);
    this.config.onCommentsLoaded?.(this.state.comments, this.state.hasMore);
  }

  /**
   * Скрывает все комментарии пользователя
   */
  public removeUserComments(userId: number | string): void {
    const isTarget = (comment: Comment) =>
      String(comment.user?.id) === String(userId);

    this.rootsRaw = this.rootsRaw.filter((comment) => !isTarget(comment));
    this.repliesRaw = this.repliesRaw.filter((comment) => !isTarget(comment));

    this.state.comments = CommentsManager.buildTree(
      this.rootsRaw,
      this.repliesRaw,
    );

    log.debug('Hidden comments of user:', userId);
    this.config.onCommentsLoaded?.(this.state.comments, this.state.hasMore);
  }

  /**
   * Удаляет комментарий вместе со всей его веткой
   */
  public removeComment(commentId: number): void {
    const doomed = new Set<number>([commentId]);
    let grew = true;

    while (grew) {
      grew = false;
      // eslint-disable-next-line no-loop-func
      this.repliesRaw.forEach((reply) => {
        const parent = reply.parent_comment ?? reply.root_id;
        if (parent && doomed.has(parent) && !doomed.has(reply.id)) {
          doomed.add(reply.id);
          grew = true;
        }
      });
    }

    this.rootsRaw = this.rootsRaw.filter((comment) => !doomed.has(comment.id));
    this.repliesRaw = this.repliesRaw.filter(
      (comment) => !doomed.has(comment.id),
    );

    this.state.comments = CommentsManager.buildTree(
      this.rootsRaw,
      this.repliesRaw,
    );

    log.debug('Removed comments:', doomed.size);
    this.config.onCommentsLoaded?.(this.state.comments, this.state.hasMore);
  }

  /**
   * Загрузить следующую страницу
   */
  public async loadNextPage(): Promise<void> {
    if (!this.currentEpisodeId) {
      log.warn('No episode ID set');
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
    this.rootsRaw = [];
    this.repliesRaw = [];
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
    if (count > 0) return SUCCESS;
    if (count < 0) return DANGER_SOFT;
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
