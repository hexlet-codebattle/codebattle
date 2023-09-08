import React, { memo, useCallback, useRef } from 'react';

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

  const { displayMenu, menuId, menuRequest } = useChatContextMenu({
    type: 'tournament',
    users,
    canInvite: false,
  });

  useChatRooms('channel');

  return (
    <ChatContextMenu inputRef={inputRef} menuId={menuId} request={menuRequest}>
      <div className="sticky-top bg-white rounded-lg">
        <div className="rounded-top shadow-sm" style={{ height: '350px' }}>
          <div className="overflow-auto h-100 text-break" id="new-chat-message">
            <div className="d-flex border-bottom align-items-center">
              <Rooms disabled={!isOnline} />
              {currentUserIsAdmin && (
                <button
                  className="btn btn-sm btn-link text-danger"
                  disabled={!isOnline}
                  type="button"
                  onClick={handleCleanBanned}
                >
                  Clean banned
                </button>
              )}
            </div>
            <div>
              <small className="pl-3 text-muted text-nowrap">Please, be nice in chat</small>
            </div>
            <Messages displayMenu={displayMenu} messages={messages} />
          </div>
        </div>
        <TournamentChatInput disabled={!isOnline} />
      </div>
    </ChatContextMenu>
  );
}

export default memo(TournamentChat);
