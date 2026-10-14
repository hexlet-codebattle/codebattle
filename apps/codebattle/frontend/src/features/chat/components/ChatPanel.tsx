import { ActionIcon, Badge, Button, CloseButton, Group, ScrollArea, Text, TextInput, Tooltip } from '@mantine/core';
import { IconLock, IconSend2, IconTrash } from '@tabler/icons-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSharedProps } from '@/shared/useSharedProps';

import type { ChatMessage, ChatUserRef } from '../types';
import { type ChatApi, MAX_MESSAGE_LENGTH, roomMessages } from '../useChat';

import classes from './Chat.module.css';
import { MessageText } from './MessageText';
import { UserCard } from '@/features/users/UserCard';
import { LangIcon } from '@/shared/LangIcon';
import { usePresenceStore } from '@/features/presence/store';

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

interface MessageRowProps {
  message: ChatMessage;
  chat: ChatApi;
  canDelete: boolean;
  /** Continues the previous message's author run: name hidden, time shown on hover. */
  grouped: boolean;
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

function MessageRow({ message, chat, canDelete, grouped, onDirectMessage }: MessageRowProps) {
  // Messages carry no language; show the author's while they're online.
  const lang = usePresenceStore((state) => state.users.find(({ id }) => id === message.user_id)?.lang);
  const { t } = useTranslation();
  const isText = message.type === 'text' && message.user_id != null;
  const privateTo =
    message.meta?.type === 'private' ? chat.rooms.find((room) => room.userId === message.meta?.target_user_id) : undefined;

  return (
    <div className={classes.message} data-grouped={grouped || undefined}>
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
                  onBan={chat.ban}
                >
                  <Text span fw={700} size="sm" c="bright">
                    {message.name}
                  </Text>
                </UserCard>
                {message.meta?.type === 'private' && (
                  <Badge size="xs" variant="light" color="violet" leftSection={<IconLock size={10} />} ml={6}>
                    {privateTo ? t('to %{name}', { name: privateTo.name }) : t('private')}
                  </Badge>
                )}{' '}
              </>
            )}
            <MessageText text={message.text} />
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
            onClick={() => chat.deleteMessage(message.id)}
            aria-label={t('Delete message')}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
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
  const [draft, setDraft] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const activeRoom = chat.rooms.find((room) => room.userId === activeRoomId) ?? null;
  const visible = useMemo(() => roomMessages(chat.messages, activeRoom, user.id), [chat.messages, activeRoom, user.id]);

  // Follow new messages unless the user scrolled up to read history.
  useEffect(() => {
    const element = viewport.current;
    if (element && stickToBottom.current) element.scrollTo({ top: element.scrollHeight });
  }, [visible.length, activeRoomId]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    chat.send(draft, activeRoom ? { id: activeRoom.userId, name: activeRoom.name } : undefined);
    setDraft('');
    stickToBottom.current = true;
  };

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
                chat={chat}
                onDirectMessage={onDirectMessage}
                canDelete={message.type === 'text' && (Boolean(user.is_admin) || message.user_id === user.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <form onSubmit={submit} className={classes.composer}>
        <TextInput
          flex={1}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!chat.online}
          placeholder={
            !chat.online
              ? t('Connecting...')
              : activeRoom
                ? t('Private message to %{name}', { name: activeRoom.name })
                : t('Be nice in chat!')
          }
          aria-label={t('Message')}
        />
        <ActionIcon type="submit" size="lg" color="green" variant="filled" disabled={!chat.online || !draft.trim()} aria-label={t('Send')}>
          <IconSend2 size={18} />
        </ActionIcon>
      </form>
    </div>
  );
}
