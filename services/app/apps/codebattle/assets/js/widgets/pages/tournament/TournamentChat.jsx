import React, {
  memo,
  useCallback,
  useRef,
  useEffect,
} from 'react';

import { useSelector } from 'react-redux';

import ChatContextMenu from '../../components/ChatContextMenu';
import Messages from '../../components/Messages';
import Rooms from '../../components/Rooms';
import { pushCommand, pushCommandTypes } from '../../middlewares/Chat';
import * as selectors from '../../selectors';
import useChatContextMenu from '../../utils/useChatContextMenu';
import useChatRooms from '../../utils/useChatRooms';

import TournamentChatInput from './TournamentChatInput';

function TournamentChat() {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const messages = useSelector(selectors.chatMessagesSelector);
  const users = useSelector(selectors.chatUsersSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);

  const handleCleanBanned = useCallback(() => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  }, []);

  const inputRef = useRef(null);

  const { menuId, menuRequest, displayMenu } = useChatContextMenu({
    type: 'tournament',
    users,
    canInvite: false,
  });

  useChatRooms('channel');

  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]);

  return (
    <ChatContextMenu menuId={menuId} inputRef={inputRef} request={menuRequest}>
      <div className="my-2 mt-lg-0 sticky-top bg-white rounded-lg position-relative d-flex flex-column" style={{ height: '450px' }}>
        <div className="d-flex border-bottom align-items-center p-2">
          <Rooms disabled={!isOnline} />
          {currentUserIsAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-link text-danger"
              onClick={handleCleanBanned}
              disabled={!isOnline}
            >
              Clean banned
            </button>
          )}
        </div>
        <div className="px-2">
          <small className="text-muted text-nowrap">Please, be nice in chat</small>
        </div>
        <div className="flex-grow-1 overflow-hidden d-flex flex-column">
          <div
            ref={messagesContainerRef}
            className="overflow-auto h-100"
            id="new-chat-message"
            style={{ scrollBehavior: 'smooth' }}
          >
            <Messages displayMenu={displayMenu} messages={messages} />
          </div>
        </div>
        <div className="border-top p-2">
          <TournamentChatInput disabled={!isOnline} />
        </div>
      </div>
    </ChatContextMenu>
  );
}

export default memo(TournamentChat);
