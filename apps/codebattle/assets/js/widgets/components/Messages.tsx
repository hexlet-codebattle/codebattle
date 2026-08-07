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

import { Box } from '@mantine/core';
import cn from 'classnames';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import i18n from '../../i18n';
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

  const messageClassName = cn(className, 'cb-messages-list', 'list-unstyled');

  if (disabled) {
    return (
      <Box
        title={i18n.t('Chat is disabled')}
        h="100%"
        pos="relative"
        ref={listRef as React.RefObject<HTMLDivElement>}
      >
        {/* <span className="d-flex text-muted position-absolute h-100 w-100 justify-content-center align-items-center"> */}
        {/*   <FontAwesomeIcon className="h-25 w-25" icon="comment-slash" /> */}
        {/* </span> */}
        {/* <div className="position-absolute h-100 w-100 bg-dark cb-opacity-50 rounded-left" /> */}
      </Box>
    );
  }

  return (
    <>
      <Box
        component="ul"
        ref={listRef as React.RefObject<HTMLUListElement>}
        className={messageClassName}
        onScroll={scrollHandler}
        pos="relative"
        pt={0}
        pl="md"
        pr="sm"
        style={{ overflow: 'auto', flexGrow: 1 }}
      >
        {messages.map((message, index) => {
          const { id, userId, name, text, type, time, meta } = message;

          const key = getKey(id, time, name, messages.length - index);

          return (
            <li key={key}>
              <Message
                id={id}
                name={name}
                userId={userId}
                currentUserId={currentUserId}
                text={text}
                type={type}
                time={time}
                meta={meta}
                displayMenu={displayMenu}
                onBanUser={onBanUser}
                onDeleteMessage={onDeleteMessage}
                canDeleteAny={canDeleteAny}
              />
            </li>
          );
        })}
      </Box>
      <Box
        component="button"
        type="button"
        className="scroll-button cb-bg-secondary"
        pos="absolute"
        p={0}
        onClick={() => {
          if (scrollBottom) {
            scrollBottom();
            setIsNearBottom(true);
            setIsScrollButtonVisible(false);
          }
        }}
        aria-label={i18n.t('Scroll to bottom')}
        style={{
          borderRadius: '50%',
          border: 0,
          visibility: isScrollButtonVisible ? 'visible' : 'hidden',
        }}
      />
    </>
  );
}

export default Messages;
