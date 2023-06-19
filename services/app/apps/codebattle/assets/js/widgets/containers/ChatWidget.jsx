import React, {
  useContext,
  useMemo,
} from 'react';
import _ from 'lodash';
import cn from 'classnames';
import { useSelector } from 'react-redux';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserInfo from './UserInfo';
import ChatInput from '../components/ChatInput';
import ChatHeader from '../components/ChatHeader';
import GameModes from '../config/gameModes';
import Notifications from './Notifications';
import GameContext from './GameContext';
import { replayerMachineStates } from '../machines/game';
import ChatContextMenu from '../components/ChatContextMenu';
import useChatContextMenu from '../utils/useChatContextMenu';
import useChatRooms from '../utils/useChatRooms';
import { shouldShowMessage } from '../utils/chat';

const ChatWidget = () => {
  const users = useSelector(state => selectors.chatUsersSelector(state));
  const messages = useSelector(state => selectors.chatMessagesSelector(state));
  const historyMessages = useSelector(selectors.chatHistoryMessagesSelector);
  const gameMode = useSelector(selectors.gameModeSelector);
  const { current: gameCurrent } = useContext(GameContext);
  const isTournamentGame = (gameMode === GameModes.tournament);
  const isStandardGame = (gameMode === GameModes.standard);

  const { menuId, menuRequest, displayMenu } = useChatContextMenu({
    type: 'game',
    users,
    canInvite: isStandardGame,
  });

  useChatRooms('page');

  const listOfUsers = useMemo(() => {
    const uniqUsers = _.uniqBy(users, 'id');
    return isTournamentGame ? _.filter(uniqUsers, { isBot: false }) : uniqUsers;
  }, [isTournamentGame, users]);

  const activeRoom = useSelector(selectors.activeRoomSelector);
  const filteredMessages = messages.filter(message => shouldShowMessage(message, activeRoom));

  return (
    <ChatContextMenu
      menuId={menuId}
      request={menuRequest}
    >
      <div className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100 rounded-lg">
        <div
          className={cn(
            'd-flex flex-column flex-grow-1 position-relative bg-white p-0 mh-100 rounded-left',
            'game-chat-container cb-messages-container',
          )}
        >
          <ChatHeader showRooms={isStandardGame} />
          {gameCurrent.matches({ replayer: replayerMachineStates.on })
            ? <Messages messages={historyMessages} />
            : <Messages displayMenu={displayMenu} messages={filteredMessages} />}
          {!gameCurrent.matches({ replayer: replayerMachineStates.on }) && <ChatInput />}
        </div>
        <div className="flex-shrink-1 p-0 border-left bg-white rounded-right game-control-container">
          <div className="d-flex flex-column justify-content-start overflow-auto h-100">
            <div className="px-3 py-3 w-100 d-flex flex-column">
              <Notifications />
            </div>
            <div className="px-3 py-3 w-100 border-top">
              <p className="mb-1">{`Online users: ${listOfUsers.length}`}</p>
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
          </div>
        </div>
      </div>
    </ChatContextMenu>
  );
};

export default ChatWidget;
