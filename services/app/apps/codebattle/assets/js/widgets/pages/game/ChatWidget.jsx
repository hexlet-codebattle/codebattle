import React, {
  useContext,
  // useMemo,
  useRef,
} from 'react';

import cn from 'classnames';
// import filter from 'lodash/filter';
// import uniqBy from 'lodash/uniqBy';
import { useSelector } from 'react-redux';

import ChatContextMenu from '../../components/ChatContextMenu';
import ChatHeader from '../../components/ChatHeader';
import ChatInput from '../../components/ChatInput';
// import ChatUserInfo from '../../components/ChatUserInfo';
import Messages from '../../components/Messages';
import RoomContext from '../../components/RoomContext';
import GameRoomModes from '../../config/gameModes';
import {
  inTestingRoomSelector,
  isRestrictedContentSelector,
  openedReplayerSelector,
} from '../../machines/selectors';
import * as selectors from '../../selectors';
import { shouldShowMessage } from '../../utils/chat';
import useChatContextMenu from '../../utils/useChatContextMenu';
import useChatRooms from '../../utils/useChatRooms';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

import Notifications from './Notifications';
import VideoConference from './VideoConference';

function ChatWidget() {
  const { mainService } = useContext(RoomContext);

  const users = useSelector(selectors.chatUsersSelector);
  const messages = useSelector(selectors.chatMessagesSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);
  const historyMessages = useSelector(selectors.chatHistoryMessagesSelector);
  const gameMode = useSelector(selectors.gameModeSelector);
  const useChat = useSelector(selectors.gameUseChatSelector);
  const showVideoConferencePanel = useSelector(selectors.showVideoConferencePanelSelector);

  const openedReplayer = useMachineStateSelector(mainService, openedReplayerSelector);
  const isTestingRoom = useMachineStateSelector(mainService, inTestingRoomSelector);
  const isRestricted = useMachineStateSelector(mainService, isRestrictedContentSelector);

  // const isTournamentGame = (gameMode === GameRoomModes.tournament);
  const isStandardGame = (gameMode === GameRoomModes.standard);
  const showChatInput = !openedReplayer && !isTestingRoom && !isRestricted && useChat;
  // const showChatParticipants = !isTestingRoom && useChat && !isRestricted;

  const disabledChatHeader = isTestingRoom || !isOnline || !useChat;
  const disabledChatMessages = isTestingRoom || !useChat || isRestricted;
  const disabledChatInput = isTestingRoom || !isOnline;

  const inputRef = useRef(null);

  const { menuId, menuRequest, displayMenu } = useChatContextMenu({
    type: 'game',
    users,
    canInvite: isStandardGame,
  });

  useChatRooms('page');

  // const listOfUsers = useMemo(() => {
  //   const uniqUsers = uniqBy(users, 'id');
  //   return isTournamentGame ? filter(uniqUsers, { isBot: false }) : uniqUsers;
  // }, [isTournamentGame, users]);

  const activeRoom = useSelector(selectors.activeRoomSelector);
  const filteredMessages = messages.filter(message => shouldShowMessage(message, activeRoom));

  return (
    <ChatContextMenu
      menuId={menuId}
      inputRef={inputRef}
      request={menuRequest}
    >
      <div className="d-flex flex-wrap flex-sm-nowrap cb-bg-panel shadow-sm h-100 cb-rounded">
        <div
          className={cn(
            'd-none d-lg-flex d-md-flex d-sm-flex flex-column flex-grow-1 position-relative p-0 h-100 mh-100 rounded-left',
            'cb-game-chat-container cb-messages-container cb-text',
          )}
        >
          {showVideoConferencePanel ? (
            <VideoConference />
          ) : (
            <>
              <ChatHeader showRooms={isStandardGame} disabled={disabledChatHeader} />
              {openedReplayer
                ? (
                  <Messages
                    messages={historyMessages}
                    disabled={disabledChatMessages}
                  />
                ) : (
                  <Messages
                    displayMenu={displayMenu}
                    messages={filteredMessages}
                    disabled={disabledChatMessages}
                  />
                )}
              {showChatInput && <ChatInput inputRef={inputRef} disabled={disabledChatInput} />}
            </>
          )}
        </div>
        <div className="flex-shrink-1 p-0 border-left cb-border-color rounded-right cb-game-control-container">
          <div className="d-flex flex-column justify-content-start overflow-auto h-100">
            <div className="px-3 py-3 w-100 d-flex flex-column">
              <Notifications />
            </div>
            {/* {showChatParticipants && ( */}
            {/*   <div className="px-3 py-3 w-100 border-top"> */}
            {/*     <p className="mb-1 text-nowrap"> */}
            {/*       {`Online players: ${listOfUsers.length}`} */}
            {/*     </p> */}
            {/*     {listOfUsers.map(user => <ChatUserInfo key={user.id} user={user} displayMenu={displayMenu} className="my-1" />)} */}
            {/*   </div> */}
            {/* )} */}
          </div>
        </div>
      </div>
    </ChatContextMenu>
  );
}

export default ChatWidget;
