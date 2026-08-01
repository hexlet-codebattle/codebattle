import React, { type MouseEvent, type KeyboardEvent } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

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
  const playerClassName = cn(
    'd-inline-block text-truncate align-top text-nowrap cb-username-max-length mr-1',
    { 'text-primary': interactive && hovered },
  );

  return (
    <>
      <span className="font-weight-bold">
        <span className={playerClassName}>{name}</span>
      </span>
      <span className="d-inline-flex align-items-center">
        <MessageTimestamp time={time!} />
        {action}
      </span>
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
      <span key={index} className="font-weight-bold bg-warning">
        {part}
      </span>
    );
  }

  if (part.startsWith('@')) {
    return (
      <span key={index} className="font-weight-bold text-primary">
        {part}
      </span>
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
      <button
        type="button"
        className="btn cb-tournament-chat-ban"
        title={i18n.t('Ban %{name}', { name })}
        aria-label={i18n.t('Ban %{name}', { name })}
        onClick={(event) => {
          event.stopPropagation();
          onBanUser({ userId, name });
        }}
      >
        <FontAwesomeIcon icon="ban" />
      </button>
    ) : null;
  const isOwnMessage = Boolean(userId && currentUserId && userId === currentUserId);
  const canDelete = Boolean(id != null && onDeleteMessage && (canDeleteAny || isOwnMessage));
  const deleteAction = canDelete ? (
    <button
      type="button"
      className="btn cb-chat-message-delete"
      title={i18n.t('Delete message')}
      aria-label={i18n.t('Delete message')}
      onClick={(event) => {
        event.stopPropagation();
        onDeleteMessage!(id!);
      }}
    >
      <FontAwesomeIcon icon="trash" />
    </button>
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

  const textPartsClassNames = cn('text-break', {
    'cb-private-text': meta?.type === 'private',
  });
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
    <div className="d-flex align-items-baseline flex-wrap mb-1">
      <span className="d-flex flex-column w-100">
        {isInteractive ? (
          <span
            ref={chatHeaderRef}
            role="button"
            tabIndex={0}
            title={`Message (${name})`}
            className="d-flex justify-content-between"
            data-user-id={userId}
            data-user-name={name}
            onContextMenu={displayMenu}
            onClick={displayMenu}
            onKeyPress={displayMenu}
          >
            {messageHeader}
          </span>
        ) : (
          <span ref={chatHeaderRef} className="d-flex justify-content-between">
            {messageHeader}
          </span>
        )}
        <span>
          <MessageTag messageType={meta?.type} />
          <span className={textPartsClassNames}>
            {parts.map((part, i) => (
              /* eslint-disable react/no-array-index-key */
              <MessagePart key={i} part={part} index={i} name={name} />
            ))}
          </span>
        </span>
      </span>
    </div>
  );
}

export default Message;
