import React, {
  useContext,
  useMemo,
  useRef,
} from 'react';

import cn from 'classnames';
import filter from 'lodash/filter';
import uniqBy from 'lodash/uniqBy';
import { useSelector } from 'react-redux';

import ChatContextMenu from '../../components/ChatContextMenu';
import ChatHeader from '../../components/ChatHeader';
import ChatInput from '../../components/ChatInput';
import Messages from '../../components/Messages';
import RoomContext from '../../components/RoomContext';
import UserInfo from '../../components/UserInfo';
import GameRoomModes from '../../config/gameModes';
import { inTestingRoomSelector, openedReplayerSelector } from '../../machines/selectors';
import * as selectors from '../../selectors';
import { shouldShowMessage } from '../../utils/chat';
import useChatContextMenu from '../../utils/useChatContextMenu';
import useChatRooms from '../../utils/useChatRooms';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import Notifications from './Notifications';

function ChatWidget() {
  const { mainService } = useContext(RoomContext);

  const users = useSelector(selectors.chatUsersSelector);
  const messages = useSelector(selectors.chatMessagesSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);
  const historyMessages = useSelector(selectors.chatHistoryMessagesSelector);
  const gameMode = useSelector(selectors.gameModeSelector);

  const openedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);
  const isTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);

  const isTournamentGame = (gameMode === GameRoomModes.tournament);
  const isStandardGame = (gameMode === GameRoomModes.standard);
  const showChatInput = !openedReplayer && !isTestingRoom;

  const inputRef = useRef(null);

  const { menuId, menuRequest, displayMenu } = useChatContextMenu({
    type: 'game',
    users,
    canInvite: isStandardGame,
  });

  useChatRooms('page');

  const listOfUsers = useMemo(() => {
    const uniqUsers = uniqBy(users, 'id');
    return isTournamentGame ? filter(uniqUsers, { isBot: false }) : uniqUsers;
  }, [isTournamentGame, users]);

  const activeRoom = useSelector(selectors.activeRoomSelector);
  const filteredMessages = messages.filter(message => shouldShowMessage(message, activeRoom));

  return (
    <ChatContextMenu
      menuId={menuId}
      inputRef={inputRef}
      request={menuRequest}
    >
      <div className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100 rounded-lg">
        <div
          className={cn(
            'd-flex flex-column flex-grow-1 position-relative bg-white p-0 mh-100 rounded-left',
            'game-chat-container cb-messages-container',
          )}
        >
          <ChatHeader showRooms={isStandardGame} disabled={!isOnline} />
          {openedReplayer
            ? <Messages messages={historyMessages} />
            : <Messages displayMenu={displayMenu} messages={filteredMessages} />}
          {showChatInput && <ChatInput inputRef={inputRef} disabled={!isOnline} />}
          {isTestingRoom && (
            <div
              className="d-flex position-absolute w-100 h-100 bg-dark cb-opacity-50 rounded-left justify-content-center text-white"
            >
              <span className="align-self-center">Chat is Disabled</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-1 p-0 border-left bg-white rounded-right game-control-container">
          <div className="d-flex flex-column justify-content-start overflow-auto h-100">
            <div className="px-3 py-3 w-100 d-flex flex-column">
              <Notifications />
            </div>
            {!isTestingRoom && (
              <div className="px-3 py-3 w-100 border-top">
                <p className="mb-1 text-nowrap">
                  {`Online players: ${listOfUsers.length}`}
                </p>
                {listOfUsers.map(user => (
                  <div
                    role="button"
                    tabIndex={0}
                    className="my-1"
                    title={user.name}
                    key={user.id}
                    data-user-id={user.id}
                    data-user-name={user.name}
                    onContextMenu={displayMenu}
                    onClick={displayMenu}
                    onKeyPress={displayMenu}
                  >
                    <UserInfo user={user} hideInfo hideOnlineIndicator />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ChatContextMenu>
  );
}

export default ChatWidget;
