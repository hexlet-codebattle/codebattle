import React, { type MouseEvent, type KeyboardEvent } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Flex, Group, Stack, Text } from '@mantine/core';

import i18n from '../../i18n';
import useHover from '../utils/useHover';

import InfoMessage from './InfoMessage';
import MessageTag from './MessageTag';
import MessageTimestamp from './MessageTimestamp';
import SystemMessage from './SystemMessage';

interface MessageMeta {
  type?: string;
  status?: string;
}

interface MessageHeaderProps {
  name: string;
  time?: number;
  hovered: boolean;
  interactive: boolean;
  action?: React.ReactNode;
}

function MessageHeader({ name, time, hovered, interactive, action }: MessageHeaderProps) {
  return (
    <>
      <Text component="span" fw={700}>
        <Text
          component="span"
          truncate
          mr="xs"
          className="cb-username-max-length"
          c={interactive && hovered ? 'blue' : undefined}
          style={{ display: 'inline-block', verticalAlign: 'top' }}
        >
          {name}
        </Text>
      </Text>
      <Group component="span" display="inline-flex" wrap="nowrap" gap={4} align="center">
        <MessageTimestamp time={time!} />
        {action}
      </Group>
    </>
  );
}

interface MessagePartProps {
  part: string;
  index: number;
  name: string;
}

function MessagePart({ part, index, name }: MessagePartProps) {
  if (part.slice(1) === name) {
    return (
      <Text key={index} component="span" fw={700} bg="yellow">
        {part}
      </Text>
    );
  }

  if (part.startsWith('@')) {
    return (
      <Text key={index} component="span" fw={700} c="blue">
        {part}
      </Text>
    );
  }

  return part;
}

export interface MessageProps {
  id?: string | number;
  text?: string;
  name?: string;
  userId?: number;
  currentUserId?: number | null;
  type?: string;
  time?: number;
  meta?: MessageMeta | null;
  displayMenu?: (event: MouseEvent | KeyboardEvent) => void;
  onBanUser?: (user: { userId: number; name: string }) => void;
  onDeleteMessage?: (id: string | number) => void;
  canDeleteAny?: boolean;
}

function Message({
  id,
  text = '',
  name = '',
  userId,
  currentUserId,
  type,
  time,
  meta,
  displayMenu,
  onBanUser,
  onDeleteMessage,
  canDeleteAny = false,
}: MessageProps) {
  const [chatHeaderRef, hoveredChatHeader] = useHover();
  const isInteractive = Boolean(userId && displayMenu);
  const banAction =
    userId && name && onBanUser ? (
      <ActionIcon
        variant="transparent"
        className="cb-tournament-chat-ban"
        title={i18n.t('Ban %{name}', { name })}
        aria-label={i18n.t('Ban %{name}', { name })}
        onClick={(event) => {
          event.stopPropagation();
          onBanUser({ userId, name });
        }}
      >
        <FontAwesomeIcon icon="ban" />
      </ActionIcon>
    ) : null;
  const isOwnMessage = Boolean(userId && currentUserId && userId === currentUserId);
  const canDelete = Boolean(id != null && onDeleteMessage && (canDeleteAny || isOwnMessage));
  const deleteAction = canDelete ? (
    <ActionIcon
      variant="transparent"
      className="cb-chat-message-delete"
      title={i18n.t('Delete message')}
      aria-label={i18n.t('Delete message')}
      onClick={(event) => {
        event.stopPropagation();
        onDeleteMessage!(id!);
      }}
    >
      <FontAwesomeIcon icon="trash" />
    </ActionIcon>
  ) : null;

  if (!text) {
    return null;
  }

  if (type === 'system') {
    return <SystemMessage text={text} meta={meta ?? null} />;
  }

  if (type === 'info') {
    return <InfoMessage text={text} time={time ?? null} />;
  }

  const parts = text.split(/(@+[-a-zA-Z0-9_]+\b)/g);

  const textPartsClassName = meta?.type === 'private' ? 'cb-private-text' : undefined;
  const messageHeader = (
    <MessageHeader
      name={name}
      time={time}
      hovered={hoveredChatHeader}
      interactive={isInteractive}
      action={
        banAction || deleteAction ? (
          <>
            {banAction}
            {deleteAction}
          </>
        ) : undefined
      }
    />
  );

  return (
    <Flex align="baseline" wrap="wrap" mb="xs">
      <Stack component="span" gap={0} w="100%">
        {isInteractive ? (
          <Group
            ref={chatHeaderRef}
            component="span"
            justify="space-between"
            wrap="nowrap"
            gap="xs"
            role="button"
            tabIndex={0}
            title={`Message (${name})`}
            data-user-id={userId}
            data-user-name={name}
            onContextMenu={displayMenu}
            onClick={displayMenu}
            onKeyPress={displayMenu}
          >
            {messageHeader}
          </Group>
        ) : (
          <Group
            ref={chatHeaderRef}
            component="span"
            justify="space-between"
            wrap="nowrap"
            gap="xs"
          >
            {messageHeader}
          </Group>
        )}
        <span>
          <MessageTag messageType={meta?.type} />
          <Text component="span" className={textPartsClassName} style={{ wordBreak: 'break-word' }}>
            {parts.map((part, i) => (
              /* eslint-disable react/no-array-index-key */
              <MessagePart key={i} part={part} index={i} name={name} />
            ))}
          </Text>
        </span>
      </Stack>
    </Flex>
  );
}

export default Message;
