import type { CommentSubmitData } from '../CommentEditor';

export interface ReplyControls {
  episodeId: number;
  animeSlug: string;
  onCopyLink: (commentId: number) => void;
  onIgnore: (userId: number | string, comment: string) => Promise<void>;
  collapseFromLevel: number;
  newSince: number;
  replyingTo: number | null;
  currentUserId: string | null;
  onReplyStart: (commentId: number) => void;
  onReplyCancel: () => void;
  onReplySubmit: (data: CommentSubmitData) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
  onEdit: (
    commentId: number,
    comment: { type: 'doc'; content: unknown[] },
  ) => Promise<void>;
}
