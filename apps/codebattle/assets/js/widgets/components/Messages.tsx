import React, {
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useMemo,
  type MouseEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react';

import cn from 'classnames';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import useStayScrolled from '../utils/useStayScrolled';

import Message from './Message';

interface ChatMessage {
  id: string | number;
  userId?: number;
  name?: string;
  text?: string;
  type?: string;
  time?: number;
  meta?: { type?: string; status?: string } | null;
}

interface MessagesProps {
  messages: ChatMessage[];
  displayMenu?: (event: MouseEvent | KeyboardEvent) => void;
  onBanUser?: (user: { userId: number; name: string }) => void;
  onDeleteMessage?: (id: string | number) => void;
  canDeleteAny?: boolean;
  currentUserId?: number | null;
  disabled?: boolean;
  className?: string;
}

const getKey = (
  id: string | number,
  time: number | undefined,
  name: string | undefined,
  index: number,
) => {
  if (!time || !name) {
    return id;
  }

  return `${id}-${time}-${name}-${index}`;
};

function Messages({
  messages,
  displayMenu,
  onBanUser,
  onDeleteMessage,
  canDeleteAny = false,
  currentUserId,
  disabled = false,
  className = '',
}: MessagesProps) {
  const listRef = useRef<HTMLElement>(null);
  const minScrollHeight = 20;
  const [, setScrollHeight] = useState(0);
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  // react-stay-scrolled types the ref as a non-null RefObject; our ref is nullable.
  const stayScrolledData = useStayScrolled(listRef as React.RefObject<HTMLElement>);
  const { stayScrolled } = stayScrolledData;
  const scrollBottom = useMemo(
    () => stayScrolledData.scrollBottom || (() => {}),
    [stayScrolledData.scrollBottom],
  );
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Check if we're near the bottom on message updates
  useLayoutEffect(() => {
    if (isNearBottom && scrollBottom) {
      scrollBottom();
      setIsScrollButtonVisible(false);
    } else {
      stayScrolled();
      setIsScrollButtonVisible(true);
    }
  }, [messages.length, stayScrolled, scrollBottom, isNearBottom]);

  const scrollHandler = (e: UIEvent<HTMLUListElement>) => {
    const chatContainer = e.target as HTMLUListElement;
    const chatScrollHeight =
      chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;

    setScrollHeight(chatScrollHeight);

    // Consider it "near bottom" if within minScrollHeight pixels
    if (chatScrollHeight <= minScrollHeight) {
      setIsNearBottom(true);
      setIsScrollButtonVisible(false);
    } else {
      setIsNearBottom(false);
      setIsScrollButtonVisible(true);
    }
  };

  // Initialize scroll state on mount
  useEffect(() => {
    if (listRef.current) {
      const chatContainer = listRef.current;
      const chatScrollHeight =
        chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;

      setScrollHeight(chatScrollHeight);
      setIsNearBottom(chatScrollHeight <= minScrollHeight);
    }
  }, []);

  const scrollButtonClass = cn(
    'scroll-button',
    'position-absolute',
    'rounded-circle',
    'cb-bg-secondary',
    'p-0',
    'border-0',
    {
      invisible: !isScrollButtonVisible,
    },
  );

  const messageClassName = cn(
    className,
    'overflow-auto pt-0 pl-3 pr-2',
    'position-relative cb-messages-list flex-grow-1',
  );

  if (disabled) {
    return (
      <div
        title="Chat is disabled"
        className="h-100 position-relative"
        ref={listRef as React.RefObject<HTMLDivElement>}
      >
        {/* <span className="d-flex text-muted position-absolute h-100 w-100 justify-content-center align-items-center"> */}
        {/*   <FontAwesomeIcon className="h-25 w-25" icon="comment-slash" /> */}
        {/* </span> */}
        {/* <div className="position-absolute h-100 w-100 bg-dark cb-opacity-50 rounded-left" /> */}
      </div>
    );
  }

  return (
    <>
      <ul
        ref={listRef as React.RefObject<HTMLUListElement>}
        className={messageClassName}
        onScroll={scrollHandler}
      >
        {messages.map((message, index) => {
          const { id, userId, name, text, type, time, meta } = message;

          const key = getKey(id, time, name, messages.length - index);

          return (
            <Message
              id={id}
              name={name}
              userId={userId}
              currentUserId={currentUserId}
              text={text}
              key={key}
              type={type}
              time={time}
              meta={meta}
              displayMenu={displayMenu}
              onBanUser={onBanUser}
              onDeleteMessage={onDeleteMessage}
              canDeleteAny={canDeleteAny}
            />
          );
        })}
      </ul>
      <button
        type="button"
        className={scrollButtonClass}
        onClick={() => {
          if (scrollBottom) {
            scrollBottom();
            setIsNearBottom(true);
            setIsScrollButtonVisible(false);
          }
        }}
        aria-label="Scroll to bottom"
      />
    </>
  );
}

export default Messages;
