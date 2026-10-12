import { useCallback, useEffect, useState } from 'react';

import { useChannel } from '@/api/useChannel';
import { t } from '@/i18n';
import { blinkTitleUntilVisible } from '@/shared/blinkTitle';
import { useSharedProps } from '@/shared/useSharedProps';

import type { ChatMessage, ChatUserRef, PrivateRoom } from './types';

export const MAX_MESSAGE_LENGTH = 1024;
const ROOM_TTL_MS = 10 * 24 * 60 * 60 * 1000;

const isPrivate = (message: ChatMessage) => message.meta?.type === 'private';

// Private rooms survive reloads (per user and chat), like the legacy lobby.
const storageKey = (userId: number, topic: string) => `cb-v2:private-rooms:${userId}:${topic}`;

function loadRooms(key: string): PrivateRoom[] {
  try {
    const rooms = JSON.parse(localStorage.getItem(key) ?? '[]') as PrivateRoom[];
    return rooms.filter((room) => room.expiresAt > Date.now());
  } catch {
    return [];
  }
}

function saveRooms(key: string, rooms: PrivateRoom[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rooms));
  } catch {
    // Storage can be unavailable (private mode); rooms then live for the page only.
  }
}

/** Joins `topic` (e.g. "chat:lobby") and exposes its messages, private rooms and actions. */
export function useChat(topic: string) {
  const { current_user: user } = useSharedProps();
  const key = storageKey(user.id, topic);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<PrivateRoom[]>(() => loadRooms(key));

  useEffect(() => saveRooms(key, rooms), [key, rooms]);

  /** Create the room with `peer`, or push its expiry back. */
  const touchRoom = useCallback((peer: ChatUserRef) => {
    setRooms((current) => [
      { userId: peer.id, name: peer.name, expiresAt: Date.now() + ROOM_TTL_MS },
      ...current.filter((room) => room.userId !== peer.id),
    ]);
  }, []);

  const { status, cast } = useChannel(topic, {
    onJoin: ({ messages: history }: { messages: ChatMessage[] }) => setMessages(history),
    events: {
      'chat:new_msg': (message: ChatMessage) => {
        setMessages((current) => [...current, message]);

        if (isPrivate(message) && message.user_id !== user.id && message.meta?.target_user_id === user.id) {
          touchRoom({ id: message.user_id!, name: message.name ?? 'user' });
          blinkTitleUntilVisible(`💬 ${t('New private message')}`);
        }
      },
      'chat:msg_deleted': ({ id }: { id: number }) =>
        setMessages((current) => current.filter((message) => message.id !== id)),
      'chat:user_banned': ({ name }: { name: string }) =>
        setMessages((current) => current.filter((message) => message.name !== name)),
    },
  });

  const send = (text: string, to?: ChatUserRef) => {
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) return;

    if (to) touchRoom(to);

    cast('chat:add_msg', {
      text: trimmed,
      meta: to ? { type: 'private', target_user_id: to.id } : { type: 'general' },
    });
  };

  return {
    online: status === 'joined',
    messages,
    rooms,
    openRoom: touchRoom,
    closeRoom: (userId: number) => setRooms((current) => current.filter((room) => room.userId !== userId)),
    send,
    deleteMessage: (id: number) => cast('chat:delete_msg', { id }),
    ban: (target: ChatUserRef) => cast('chat:command', { type: 'ban', name: target.name, user_id: target.id }),
    cleanBanned: () => cast('chat:command', { type: 'clean_banned' }),
  };
}

export type ChatApi = ReturnType<typeof useChat>;

/** Messages to show in a room: everything in General, only the conversation in a private room. */
export function roomMessages(messages: ChatMessage[], room: PrivateRoom | null, userId: number) {
  if (!room) return messages;

  return messages.filter(
    (message) =>
      isPrivate(message) &&
      ((message.user_id === userId && message.meta?.target_user_id === room.userId) ||
        (message.user_id === room.userId && message.meta?.target_user_id === userId)),
  );
}
