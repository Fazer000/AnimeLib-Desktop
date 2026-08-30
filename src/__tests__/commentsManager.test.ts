import {
  CommentsManager,
  Comment,
} from '../renderer/services/player/CommentsManager';

const makeComment = (
  id: number,
  username: string,
  extra: Partial<Comment> = {},
): Comment => ({
  id,
  comment: `текст ${id}`,
  created_at: '2026-01-01T00:00:00Z',
  user: {
    id,
    username,
    avatar: { url: '' },
    premium: { enabled: false },
  },
  votes: { up: 0, down: 0 },
  ...extra,
});

describe('CommentsManager.buildTree', () => {
  it('раскладывает плоский список ответов по веткам', () => {
    const roots = [makeComment(1, 'root')];
    const replies = [
      makeComment(2, 'a', { parent_comment: 1, root_id: 1 }),
      makeComment(3, 'b', { parent_comment: 2, root_id: 1 }),
    ];

    const tree = CommentsManager.buildTree(roots, replies);

    expect(tree).toHaveLength(1);
    expect(tree[0].replies).toHaveLength(1);
    expect(tree[0].replies![0].id).toBe(2);
    expect(tree[0].replies![0].replies![0].id).toBe(3);
  });

  it('подставляет имя автора родителя для подписи «в ответ»', () => {
    const roots = [makeComment(1, 'root')];
    const replies = [makeComment(2, 'a', { parent_comment: 1, root_id: 1 })];

    const [tree] = CommentsManager.buildTree(roots, replies);

    expect(tree.replies![0].parentUser).toBe('root');
  });

  it('без parent_comment цепляет ответ к корню ветки', () => {
    const roots = [makeComment(1, 'root')];
    const replies = [makeComment(5, 'a', { root_id: 1 })];

    const [tree] = CommentsManager.buildTree(roots, replies);

    expect(tree.replies![0].id).toBe(5);
  });

  it('ответ на неизвестного родителя не теряет остальные и не бросает', () => {
    const roots = [makeComment(1, 'root')];
    const replies = [
      makeComment(2, 'a', { parent_comment: 999 }),
      makeComment(3, 'b', { parent_comment: 1, root_id: 1 }),
    ];

    const [tree] = CommentsManager.buildTree(roots, replies);

    expect(tree.replies).toHaveLength(1);
    expect(tree.replies![0].id).toBe(3);
  });

  it('ответ, ссылающийся сам на себя, не создаёт цикл', () => {
    const roots = [makeComment(1, 'root')];
    const replies = [makeComment(2, 'a', { parent_comment: 2, root_id: 1 })];

    const [tree] = CommentsManager.buildTree(roots, replies);

    expect(tree.replies).toHaveLength(0);
  });

  it('порядок корневых комментариев сохраняется', () => {
    const roots = [
      makeComment(3, 'c'),
      makeComment(1, 'a'),
      makeComment(2, 'b'),
    ];

    const tree = CommentsManager.buildTree(roots, []);

    expect(tree.map((comment) => comment.id)).toEqual([3, 1, 2]);
  });
});

describe('CommentsManager: вставка, правка, удаление', () => {
  const load = (
    manager: CommentsManager,
    roots: Comment[],
    replies: Comment[],
  ) => {
    roots.forEach((root) => manager.insertComment(root));
    replies.forEach((reply) => manager.insertComment(reply));
  };

  it('новый корневой комментарий встаёт наверх при сортировке по убыванию', () => {
    const manager = new CommentsManager({ sortType: 'desc' });

    load(manager, [makeComment(1, 'a'), makeComment(2, 'b')], []);

    expect(manager.getState().comments.map((c) => c.id)).toEqual([2, 1]);
  });

  it('при сортировке по возрастанию — вниз', () => {
    const manager = new CommentsManager({ sortType: 'asc' });

    load(manager, [makeComment(1, 'a'), makeComment(2, 'b')], []);

    expect(manager.getState().comments.map((c) => c.id)).toEqual([1, 2]);
  });

  it('повторная вставка того же комментария игнорируется', () => {
    const manager = new CommentsManager();

    load(manager, [makeComment(1, 'a'), makeComment(1, 'a')], []);

    expect(manager.getState().comments).toHaveLength(1);
  });

  it('правка меняет текст, не трогая ветку', () => {
    const manager = new CommentsManager();
    load(
      manager,
      [makeComment(1, 'root')],
      [makeComment(2, 'a', { parent_comment: 1, root_id: 1 })],
    );

    manager.updateComment(makeComment(1, 'root', { comment: 'исправлено' }));

    const [tree] = manager.getState().comments;
    expect(tree.comment).toBe('исправлено');
    expect(tree.replies).toHaveLength(1);
  });

  it('удаление комментария уносит всю вложенную ветку', () => {
    const manager = new CommentsManager();
    load(
      manager,
      [makeComment(1, 'root')],
      [
        makeComment(2, 'a', { parent_comment: 1, root_id: 1 }),
        makeComment(3, 'b', { parent_comment: 2, root_id: 1 }),
        makeComment(4, 'c', { parent_comment: 3, root_id: 1 }),
      ],
    );

    manager.removeComment(2);

    const [tree] = manager.getState().comments;
    expect(tree.replies).toHaveLength(0);
  });

  it('игнор скрывает все комментарии пользователя на любом уровне', () => {
    const manager = new CommentsManager();
    load(
      manager,
      [makeComment(1, 'root'), makeComment(9, 'spam')],
      [makeComment(2, 'spam', { parent_comment: 1, root_id: 1 })],
    );

    manager.removeUserComments(9);

    const { comments } = manager.getState();
    expect(comments.map((c) => c.id)).toEqual([1]);
    expect(comments[0].replies).toHaveLength(1);
  });
});

describe('CommentsManager: голоса', () => {
  it('счётчик — разница между плюсами и минусами', () => {
    expect(
      CommentsManager.getVoteCount(
        makeComment(1, 'a', { votes: { up: 5, down: 2 } }),
      ),
    ).toBe(3);
  });

  it('цвет зависит от знака', () => {
    const positive = CommentsManager.getVoteColor(1);
    const negative = CommentsManager.getVoteColor(-1);

    expect(CommentsManager.getVoteColor(0)).toBe('inherit');
    expect(positive).not.toBe(negative);
    expect(positive).not.toBe('inherit');
  });
});

describe('CommentsManager.formatDate', () => {
  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  it('свежие отметки описывает словами', () => {
    expect(CommentsManager.formatDate(minutesAgo(0))).toBe('только что');
    expect(CommentsManager.formatDate(minutesAgo(30))).toBe('30 мин назад');
    expect(CommentsManager.formatDate(minutesAgo(60 * 3))).toBe('3 ч назад');
    expect(CommentsManager.formatDate(minutesAgo(60 * 24 * 2))).toBe(
      '2 д назад',
    );
  });

  it('старше недели показывает дату', () => {
    const formatted = CommentsManager.formatDate(minutesAgo(60 * 24 * 30));

    expect(formatted).not.toContain('назад');
    expect(formatted).toMatch(/\d{4}/);
  });
});
