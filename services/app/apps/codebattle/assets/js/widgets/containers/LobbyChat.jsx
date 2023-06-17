import React, { useEffect, useMemo } from 'react';
import { connect, useSelector, useDispatch } from 'react-redux';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserInfo from './UserInfo';
import ChatInput from '../components/ChatInput';
import * as chatMiddlewares from '../middlewares/Chat';
import ChatHeader from '../components/ChatHeader';
import { getPrivateRooms, clearExpiredPrivateRooms, updatePrivateRooms } from '../middlewares/Room';
import { actions } from '../slices';
import getName from '../utils/names';
import ChatContextMenu from '../components/ChatContextMenu';
import useChatContextMenu from '../utils/useChatContextMenu';

const LobbyChat = ({ connectToChat }) => {
  const pageName = getName('page');
  const dispatch = useDispatch();
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const messages = useSelector(selectors.chatMessagesSelector);
  const rooms = useSelector(selectors.roomsSelector);

  const users = useMemo(() => (
    presenceList.map(({ user }) => user)
  ), [presenceList]);

  const { menuId, menuRequest, displayMenu } = useChatContextMenu({
    type: 'lobby',
    users,
    canInvite: true,
  });

  useEffect(() => {
    connectToChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearExpiredPrivateRooms();
    const existingPrivateRooms = getPrivateRooms(pageName);
    dispatch(actions.setPrivateRooms(existingPrivateRooms));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const privateRooms = rooms.slice(1);
    updatePrivateRooms(privateRooms, pageName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  return (
    <ChatContextMenu
      menuId={menuId}
      request={menuRequest}
    >
      <div className="d-flex flex-wrap rounded shadow-sm mt-2 cb-chat-container">
        <div className="col-12 col-sm-8 p-0 bg-light rounded-left h-sm-100 position-relative d-flex flex-column cb-messages-container">
          <ChatHeader showRooms />
          <Messages displayMenu={displayMenu} messages={messages} />
          <ChatInput />
        </div>
        <div className="col-12 col-sm-4 p-0 pb-3 pb-sm-4 border-left bg-light rounded-right cb-players-container">
          <div className="d-flex flex-column h-100">
            <p className="px-3 pt-2 mb-3">{`Online players: ${presenceList.length}`}</p>
            <div className="d-flex px-3 flex-column align-items-start overflow-auto">
              {presenceList.map(presenceUser => (
                <div
                  role="button"
                  tabIndex={0}
                  className="mb-1"
                  title={presenceUser.user.name}
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  onContextMenu={displayMenu}
                  onClick={displayMenu}
                  onKeyPress={displayMenu}
                >
                  <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ChatContextMenu>
  );
};

const mapDispatchToProps = {
  connectToChat: chatMiddlewares.connectToChat,
};

export default connect(null, mapDispatchToProps)(LobbyChat);
