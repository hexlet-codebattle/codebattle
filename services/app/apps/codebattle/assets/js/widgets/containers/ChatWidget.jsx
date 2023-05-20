import React, { useContext } from 'react';
import _ from 'lodash';
import { useSelector } from 'react-redux';
import * as selectors from '../selectors';
import Messages from '../components/Messages';
import UserInfo from './UserInfo';
import ChatInput from '../components/ChatInput';
import GameTypeCodes from '../config/gameTypeCodes';
import Notifications from './Notifications';
import GameContext from './GameContext';
import { replayerMachineStates } from '../machines/game';

const ChatWidget = () => {
  const users = useSelector(state => selectors.chatUsersSelector(state));
  const messages = useSelector(state => selectors.chatMessagesSelector(state));
  const gameType = useSelector(selectors.gameTypeSelector);
  const { current: gameCurrent } = useContext(GameContext);
  const isTournamentGame = (gameType === GameTypeCodes.tournament);

  const uniqUsers = _.uniqBy(users, 'id');
  const listOfUsers = isTournamentGame ? _.filter(uniqUsers, { isBot: false }) : uniqUsers;
  return (
    <div className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100">
      {/* eslint-disable-next-line max-len */}
      <div className="flex-grow-1 p-0 bg-white rounded-left mh-100 position-relative game-chat-container d-flex flex-column cb-messages-container">
        <Messages messages={messages} />
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
