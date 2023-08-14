import React, {
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { connect, useSelector } from 'react-redux';
import _ from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as selectors from '../../selectors';
import Messages from '../../components/Messages';
import UserInfo from '../../components/UserInfo';
import ChatInput from '../../components/ChatInput';
import * as chatMiddlewares from '../../middlewares/Chat';
import ChatHeader from '../../components/ChatHeader';
import ChatContextMenu from '../../components/ChatContextMenu';
import useChatContextMenu from '../../utils/useChatContextMenu';
import useChatRooms from '../../utils/useChatRooms';
import { shouldShowMessage } from '../../utils/chat';
import Loading from '../../components/Loading';

function LobbyChat({
  connectToChat,
  presenceList,
  setOpenActionModalShowing,
  inputRef,
}) {
  const messages = useSelector(selectors.chatMessagesSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);

  const users = useMemo(() => (
    presenceList.map(({ user }) => user)
  ), [presenceList]);

  useEffect(() => {
    connectToChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { menuId, menuRequest, displayMenu } = useChatContextMenu({
    type: 'lobby',
    users,
    canInvite: true,
  });

  const openSendMessageModal = useCallback(() => {
    setOpenActionModalShowing({ opened: true, action: 'sendMessage' });
  }, [setOpenActionModalShowing]);

  const openSendInviteModal = useCallback(() => {
    setOpenActionModalShowing({ opened: true, action: 'sendInvite' });
  }, [setOpenActionModalShowing]);

  useChatRooms('page');

  const activeRoom = useSelector(selectors.activeRoomSelector);
  const filteredMessages = messages.filter(message => shouldShowMessage(message, activeRoom));

  if (!presenceList) {
    return null;
  }

  const {
    watching: watchingList = [],
    online: onlineList = [],
    lobby: lobbyList = [],
    playing: playingList = [],
    task: builderList = [],
  } = _.groupBy(presenceList, 'currentState');

  return (
    <ChatContextMenu
      menuId={menuId}
      inputRef={inputRef}
      request={menuRequest}
    >
      <div className="d-flex flex-wrap rounded shadow-sm mt-2 cb-lobby-widget-container">
        <div className="col-12 col-sm-8 p-0 bg-light rounded-left h-sm-100 position-relative d-flex flex-column cb-lobby-widget-container">
          <ChatHeader disabled={!isOnline} showRooms />
          <Messages displayMenu={displayMenu} messages={filteredMessages} />
          <ChatInput disabled={!isOnline} inputRef={inputRef} />
        </div>
        <div className="col-12 col-sm-4 p-0 pb-3 pb-sm-4 border-left bg-light rounded-right cb-players-container">
          <div className="d-flex flex-column h-100">
            <div className="d-flex justify-content-between">
              {isOnline ? (
                <p className="px-3 pt-2 mb-2 text-nowrap">
                  {`Online players: ${presenceList.length}`}
                </p>
              ) : (
                <div className="px-3 pt-2 mb-2 text-nowrap">
                  <Loading adaptive />
                </div>
              )}
              <div className="d-flex justify-items-center p-2">
                <button
                  type="button"
                  className="btn btn-sm p-0 rounded-lg mr-1"
                  onClick={openSendMessageModal}
                  disabled={!isOnline || presenceList.length <= 1}
                >
                  <FontAwesomeIcon
                    title="Send message"
                    className="text-dark"
                    icon="envelope"
                  />
                </button>
                <button
                  type="button"
                  className="btn btn-sm p-0 rounded-lg"
                  onClick={openSendInviteModal}
                  disabled={!isOnline || presenceList.length <= 1}
                >
                  <img
                    title="Send fight invite"
                    alt="fight"
                    style={{ width: '16px', height: '16px' }}
                    src="/assets/images/fight-black.png"
                  />
                </button>
              </div>
            </div>
            <div className="d-flex px-3 flex-column align-items-start overflow-auto">
              {watchingList.length !== 0 && <div>Watching: </div>}
              {watchingList.map(presenceUser => (
                <div
                  role="button"
                  tabIndex={0}
                  className="mb-1"
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  data-user-name={presenceUser.user.name}
                  onContextMenu={displayMenu}
                  onClick={displayMenu}
                  onKeyPress={displayMenu}
                >
                  <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                </div>
              ))}
              {playingList.length !== 0 && <div>Playing: </div>}
              {playingList.map(presenceUser => (
                <div
                  role="button"
                  tabIndex={0}
                  className="mb-1"
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  data-user-name={presenceUser.user.name}
                  onContextMenu={displayMenu}
                  onClick={displayMenu}
                  onKeyPress={displayMenu}
                >
                  <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                </div>
              ))}
              {lobbyList.length !== 0 && <div>Lobby: </div>}
              {lobbyList.map(presenceUser => (
                <div
                  role="button"
                  tabIndex={0}
                  className="mb-1"
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  data-user-name={presenceUser.user.name}
                  onContextMenu={displayMenu}
                  onClick={displayMenu}
                  onKeyPress={displayMenu}
                >
                  <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                </div>
              ))}
              {onlineList.length !== 0 && <div>Online: </div>}
              {onlineList.map(presenceUser => (
                <div
                  role="button"
                  tabIndex={0}
                  className="mb-1"
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  data-user-name={presenceUser.user.name}
                  onContextMenu={displayMenu}
                  onClick={displayMenu}
                  onKeyPress={displayMenu}
                >
                  <UserInfo user={presenceUser.user} hideInfo hideOnlineIndicator />
                </div>
              ))}
              {builderList.length !== 0 && <div>Edit task: </div>}
              {builderList.map(presenceUser => (
                <div
                  role="button"
                  tabIndex={0}
                  className="mb-1"
                  key={presenceUser.id}
                  data-user-id={presenceUser.id}
                  data-user-name={presenceUser.user.name}
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
}

const mapDispatchToProps = {
  connectToChat: chatMiddlewares.connectToChat,
};

export default connect(null, mapDispatchToProps)(LobbyChat);
