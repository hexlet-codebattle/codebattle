import { ActionIcon, Badge, Button, CloseButton, Group, ScrollArea, Text, Tooltip } from '@mantine/core';
import { IconLock, IconSend2, IconTrash } from '@tabler/icons-react';
import { type FormEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import { mentions } from '../mentions';
import type { ChatMessage, ChatUserRef } from '../types';
import { type ChatApi, MAX_MESSAGE_LENGTH, roomMessages } from '../useChat';

import classes from './Chat.module.css';
import { ChatInput } from './ChatInput';
import { MessageText } from './MessageText';
import { MessageReactions } from './MessageReactions';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { usePresenceStore } from '@/features/presence/store';
import { useLatest } from '@/shared/useLatest';

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

/** What a row needs from the chat; stable while the connection state holds, so rows can be memoized. */
type RowActions = Pick<ChatApi, 'online' | 'react' | 'deleteMessage' | 'ban'>;

interface MessageRowProps {
  message: ChatMessage;
  actions: RowActions;
  canDelete: boolean;
  /** Continues the previous message's author run: name hidden, time shown on hover. */
  grouped: boolean;
  /** The author's current language while they're online, else the one the message was sent with. */
  lang: string | null | undefined;
  /** Peer name of the private room a message of yours went to, when that room is open. */
  privateTo: string | undefined;
  onDirectMessage: (user: ChatUserRef) => void;
}

const GROUP_WINDOW_SECONDS = 120;

const continuesRun = (previous: ChatMessage | undefined, message: ChatMessage) =>
  previous != null &&
  previous.type === 'text' &&
  message.type === 'text' &&
  previous.user_id === message.user_id &&
  previous.meta?.type === message.meta?.type &&
  previous.meta?.target_user_id === message.meta?.target_user_id &&
  (message.time ?? 0) - (previous.time ?? 0) < GROUP_WINDOW_SECONDS;

// Memoized: the panel re-renders on every keystroke, presence diff and (in the lobby) game update.
const MessageRow = memo(function MessageRow({
  message,
  actions,
  canDelete,
  grouped,
  lang,
  privateTo,
  onDirectMessage,
}: MessageRowProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const isText = message.type === 'text' && message.user_id != null;
  const mentioned = isText && message.user_id !== me.id && mentions(message.text, me.name);

  return (
    <div className={classes.message} data-chat-message data-grouped={grouped || undefined} data-mentioned={mentioned || undefined}>
      {message.time != null && (
        <Text span size="xs" c="dimmed" ff="monospace" className={classes.time}>
          {timeFormat.format(message.time * 1000)}
        </Text>
      )}
      <div className={classes.body}>
        {isText ? (
          <>
            {!grouped && (
              <>
                <LangIcon lang={lang} />{' '}
                <UserCard
                  user={{ id: message.user_id!, name: message.name ?? '' }}
                  onDirectMessage={onDirectMessage}
                  onBan={actions.ban}
                >
                  <Text span fw={700} size="sm" c="bright">
                    {message.name}
                  </Text>
                </UserCard>
                {message.meta?.type === 'private' && (
                  <Badge size="xs" variant="light" color="violet" leftSection={<IconLock size={10} />} ml={6}>
                    {privateTo ? t('to %{name}', { name: privateTo }) : t('private')}
                  </Badge>
                )}{' '}
              </>
            )}
            <MessageText text={message.text} />
            <MessageReactions message={message} chat={actions} />
          </>
        ) : (
          <Text span size="sm" c="dimmed" fs="italic">
            {message.text}
          </Text>
        )}
      </div>
      {canDelete && (
        <Tooltip label={t('Delete message')}>
          <ActionIcon
            size="sm"
            color="red"
            variant="subtle"
            className={classes.delete}
            onClick={() => actions.deleteMessage(message.id)}
            aria-label={t('Delete message')}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
});

interface ComposerProps {
  chat: ChatApi;
  /** Private room peer, or null for General. */
  room: { userId: number; name: string } | null;
  onSent: () => void;
}

// The draft lives here so typing doesn't re-render the message list.
function Composer({ chat, room, onSent }: ComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    chat.send(draft, room ? { id: room.userId, name: room.name } : undefined);
    setDraft('');
    onSent();
  };

  return (
    <form onSubmit={submit} className={classes.composer}>
      <ChatInput
        flex={1}
        value={draft}
        onValueChange={setDraft}
        messages={chat.messages}
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={!chat.online}
        placeholder={
          !chat.online
            ? t('Connecting...')
            : room
              ? t('Private message to %{name}', { name: room.name })
              : t('Be nice in chat!')
        }
        aria-label={t('Message')}
      />
      <ActionIcon type="submit" size="lg" color="green" variant="filled" disabled={!chat.online || !draft.trim()} aria-label={t('Send')}>
        <IconSend2 size={18} />
      </ActionIcon>
    </form>
  );
}

interface ChatPanelProps {
  chat: ChatApi;
  /** Private room shown (peer user id), or null for General. Owned by the parent so other widgets can open DMs. */
  activeRoomId: number | null;
  onRoomChange: (userId: number | null) => void;
  onDirectMessage: (user: ChatUserRef) => void;
  /** Pixels, or "fill" to take the rest of a flex parent's height. */
  height?: number | 'fill';
}

export function ChatPanel({ chat, activeRoomId, onRoomChange: setActiveRoomId, onDirectMessage, height = 360 }: ChatPanelProps) {
  const { t } = useTranslation();
  const { current_user: user } = useSharedProps();
  const viewport = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const activeRoom = chat.rooms.find((room) => room.userId === activeRoomId) ?? null;
  const visible = useMemo(() => roomMessages(chat.messages, activeRoom, user.id), [chat.messages, activeRoom, user.id]);

  // One lookup table per presence diff instead of a store subscription per row.
  const onlineUsers = usePresenceStore((state) => state.users);
  const onlineLangs = useMemo(() => new Map(onlineUsers.map(({ id, lang }) => [id, lang])), [onlineUsers]);

  const { online, react, deleteMessage, ban } = chat;
  const actions = useMemo(() => ({ online, react, deleteMessage, ban }), [online, react, deleteMessage, ban]);

  // Parents may pass a fresh callback each render; rows get a stable one.
  const latestDirectMessage = useLatest(onDirectMessage);
  const directMessage = useCallback((peer: ChatUserRef) => latestDirectMessage.current(peer), [latestDirectMessage]);

  // Follow new messages unless the user scrolled up to read history.
  useEffect(() => {
    const element = viewport.current;
    if (element && stickToBottom.current) element.scrollTo({ top: element.scrollHeight });
  }, [visible.length, activeRoomId]);

  return (
    <div className={classes.panel} data-fill={height === 'fill' || undefined}>
      <Group gap={4} px="sm" py={6} className={classes.rooms} wrap="nowrap">
        <ScrollArea type="never" flex={1}>
          <Group gap={4} wrap="nowrap">
            <Button
              size="compact-sm"
              variant={activeRoom ? 'subtle' : 'light'}
              onClick={() => setActiveRoomId(null)}
            >
              {t('General')}
            </Button>
            {chat.rooms.map((room) => (
              <Button
                key={room.userId}
                size="compact-sm"
                variant={room.userId === activeRoomId ? 'light' : 'subtle'}
                leftSection={<IconLock size={12} />}
                rightSection={
                  <CloseButton
                    size="xs"
                    component="span"
                    aria-label={t('Close chat with %{name}', { name: room.name })}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (room.userId === activeRoomId) setActiveRoomId(null);
                      chat.closeRoom(room.userId);
                    }}
                  />
                }
                onClick={() => setActiveRoomId(room.userId)}
              >
                {room.name}
              </Button>
            ))}
          </Group>
        </ScrollArea>
        {user.is_admin && (
          <Button size="compact-xs" variant="subtle" onClick={chat.cleanBanned}>
            {t('Clean banned')}
          </Button>
        )}
      </Group>

      <ScrollArea
        h={height === 'fill' ? undefined : height}
        className={classes.scroll}
        viewportRef={viewport}
        onScrollPositionChange={({ y }) => {
          const element = viewport.current;
          if (element) stickToBottom.current = element.scrollHeight - element.clientHeight - y < 40;
        }}
      >
        <div className={classes.messages}>
          {visible.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {activeRoom
                ? t('Start a private conversation with %{name}.', { name: activeRoom.name })
                : t('No messages yet. Say hi!')}
            </Text>
          ) : (
            visible.map((message, index) => (
              <MessageRow
                key={message.id}
                message={message}
                grouped={continuesRun(visible[index - 1], message)}
                actions={actions}
                lang={(message.user_id != null ? onlineLangs.get(message.user_id) : null) ?? message.lang}
                privateTo={
                  message.meta?.type === 'private'
                    ? chat.rooms.find((room) => room.userId === message.meta?.target_user_id)?.name
                    : undefined
                }
                onDirectMessage={directMessage}
                canDelete={message.type === 'text' && (Boolean(user.is_admin) || message.user_id === user.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <Composer
        chat={chat}
        room={activeRoom}
        onSent={() => {
          stickToBottom.current = true;
        }}
      />
    </div>
  );
}
