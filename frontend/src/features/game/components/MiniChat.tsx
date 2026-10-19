import { ActionIcon, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowsDiagonal, IconLock, IconMessages, IconSend2 } from '@tabler/icons-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChatInput } from '@/features/chat/components/ChatInput';
import { MessageText } from '@/features/chat/components/MessageText';
import { MessageReactions } from '@/features/chat/components/MessageReactions';
import { mentions } from '@/features/chat/mentions';
import type { ChatUserRef } from '@/features/chat/types';
import { type ChatApi, MAX_MESSAGE_LENGTH } from '@/features/chat/useChat';
import { UserCard } from '@/features/users/UserCard';
import { useSharedProps } from '@/shared/useSharedProps';

import classes from '../GameRoom.module.css';

import { Spectators } from './Spectators';

const SHOWN_MESSAGES = 50;
interface MiniChatProps {
  chat: ChatApi;
  gameId: number;
  playerIds: number[];
  /** The full chat (rooms, history, moderation) in the drawer. */
  onExpand: () => void;
  onDirectMessage: (user: ChatUserRef) => void;
}

/**
 * The chat at a glance beside the task: who watches, the latest messages and a one-line
 * composer for General. Everything else (private rooms, deleting, bans) lives in the drawer.
 */
export function MiniChat({ chat, gameId, playerIds, onExpand, onDirectMessage }: MiniChatProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();
  const [draft, setDraft] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  // My private conversations too (marked), so a DM to me isn't missed while the drawer is shut.
  const messages = useMemo(
    () =>
      chat.messages
        .filter(
          (message) =>
            message.meta?.type !== 'private' || message.user_id === me.id || message.meta?.target_user_id === me.id,
        )
        .slice(-SHOWN_MESSAGES),
    [chat.messages, me.id],
  );

  // Follow new messages unless scrolled up to read.
  useEffect(() => {
    const element = list.current;
    if (element && stickToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    chat.send(draft);
    setDraft('');
    stickToBottom.current = true;
  };

  return (
    <section className={classes.miniChat} aria-label={t('Chat')}>
      <header className={classes.miniChatHead}>
        <UnstyledButton className={classes.miniChatTitle} onClick={onExpand}>
          <IconMessages size={14} />
          {t('Chat')}
        </UnstyledButton>
        <Spectators gameId={gameId} playerIds={playerIds} />
        <Tooltip label={t('Open the full chat')}>
          <ActionIcon size="sm" variant="subtle" color="gray" onClick={onExpand} aria-label={t('Open the full chat')}>
            <IconArrowsDiagonal size={14} />
          </ActionIcon>
        </Tooltip>
      </header>

      <div
        ref={list}
        className={classes.miniChatList}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current = element.scrollHeight - element.clientHeight - element.scrollTop < 24;
        }}
      >
        {messages.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" m="auto">
            {t('No messages yet. Say hi!')}
          </Text>
        ) : (
          messages.map((message) =>
            message.type === 'text' && message.user_id != null ? (
              <div
                key={message.id}
                className={classes.miniChatMessage}
                data-chat-message
                data-mine={message.user_id === me.id || undefined}
                data-mentioned={(message.user_id !== me.id && mentions(message.text, me.name)) || undefined}
              >
                {message.meta?.type === 'private' && <IconLock size={11} className={classes.miniChatLock} aria-label={t('private')} />}
                <UserCard user={{ id: message.user_id, name: message.name ?? '' }} onDirectMessage={onDirectMessage}>
                  <span className={classes.miniChatName}>{message.name}</span>
                </UserCard>{' '}
                <MessageText text={message.text} />
                <MessageReactions message={message} chat={chat} />
              </div>
            ) : (
              <div key={message.id} className={classes.miniChatMessage} data-system>
                {message.text}
              </div>
            ),
          )
        )}
      </div>

      <form onSubmit={submit} className={classes.miniChatComposer}>
        <ChatInput
          size="xs"
          flex={1}
          value={draft}
          onValueChange={setDraft}
          messages={chat.messages}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={!chat.online}
          placeholder={chat.online ? t('Be nice in chat!') : t('Connecting...')}
          aria-label={t('Message')}
        />
        <ActionIcon type="submit" size={30} color="green" variant="filled" disabled={!chat.online || !draft.trim()} aria-label={t('Send')}>
          <IconSend2 size={15} />
        </ActionIcon>
      </form>
    </section>
  );
}
