// Codebattle.Chat.Message as pushed on "chat:*" topics.
export interface ChatMessage {
  id: number;
  /** "text" from users; anything else is a system notice (bans, etc.). */
  type: string;
  user_id: number | null;
  name: string | null;
  text: string;
  /** Unix seconds. */
  time: number | null;
  meta: { type?: 'general' | 'private'; target_user_id?: number } | null;
}

export interface PrivateRoom {
  userId: number;
  name: string;
  /** Epoch ms; rooms disappear after a period without messages. */
  expiresAt: number;
}

export type ChatRoom = { kind: 'general' } | ({ kind: 'private' } & PrivateRoom);

export interface ChatUserRef {
  id: number;
  name: string;
}
