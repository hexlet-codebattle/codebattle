import React, { useContext, useEffect } from 'react';
import _ from 'lodash';
import { useSelector, useDispatch } from 'react-redux';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserInfo from './UserInfo';
import ChatInput from '../components/ChatInput';
import ChatHeader from '../components/ChatHeader';
import GameTypeCodes from '../config/gameTypeCodes';
import Notifications from './Notifications';
import GameContext from './GameContext';
import { replayerMachineStates } from '../machines/game';
import { getPrivateRooms, clearExpiredPrivateRooms, updatePrivateRooms } from '../middlewares/Room';
import { actions } from '../slices';
import getChatName from '../utils/names';
import { shouldShowMessage } from "../utils/chat";

const ChatWidget = () => {
  const dispatch = useDispatch();
  const users = useSelector(state => selectors.chatUsersSelector(state));
  const messages = useSelector(state => selectors.chatMessagesSelector(state));
  const activeRoom = useSelector(selectors.activeRoomSelector)
  const historyMessages = useSelector(selectors.chatHistoryMessagesSelector);
  const gameType = useSelector(selectors.gameTypeSelector);
  const { current: gameCurrent } = useContext(GameContext);
  const isTournamentGame = (gameType === GameTypeCodes.tournament);
  const pageName = getChatName('page');
  const rooms = useSelector(selectors.roomsSelector);

  const filteredMessages = messages.filter(message => shouldShowMessage(message, activeRoom));

  useEffect(() => {
    clearExpiredPrivateRooms();
    const existingPrivateRooms = getPrivateRooms(pageName);
    dispatch(actions.setPrivateRooms(existingPrivateRooms));
  }, []);

  useEffect(() => {
    const privateRooms = rooms.slice(1);
    updatePrivateRooms(privateRooms, pageName);
  }, [rooms]);

  const uniqUsers = _.uniqBy(users, 'id');
  const listOfUsers = isTournamentGame ? _.filter(uniqUsers, { isBot: false }) : uniqUsers;
  return (
    <div className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100">
      {/* eslint-disable-next-line max-len */}
      <div className="flex-grow-1 p-0 bg-white rounded-left mh-100 position-relative game-chat-container d-flex flex-column cb-messages-container">
        <ChatHeader />
        {gameCurrent.matches({ replayer: replayerMachineStates.on })
          ? <Messages messages={historyMessages} />
          : <Messages messages={filteredMessages} />}
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
              <div key={user.id} className="my-1">
                <UserInfo user={user} hideOnlineIndicator />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
