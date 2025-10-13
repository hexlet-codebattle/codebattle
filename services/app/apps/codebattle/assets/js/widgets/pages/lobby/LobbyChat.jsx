import React, {
  memo,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import groupBy from 'lodash/groupBy';
import { useDispatch, useSelector } from 'react-redux';

import ChatContextMenu from '../../components/ChatContextMenu';
import ChatHeader from '../../components/ChatHeader';
import ChatInput from '../../components/ChatInput';
import ChatUserInfo from '../../components/ChatUserInfo';
import Loading from '../../components/Loading';
import Messages from '../../components/Messages';
import * as chatMiddlewares from '../../middlewares/Chat';
import * as selectors from '../../selectors';
import { shouldShowMessage } from '../../utils/chat';
import useChatContextMenu from '../../utils/useChatContextMenu';
import useChatRooms from '../../utils/useChatRooms';

function UsersList({
  list, title, displayMenu, mode,
}) {
  return (
    <>
      {list.length !== 0 && <div>{`${title}: `}</div>}
      {list.map(player => (
        <ChatUserInfo
          mode={mode}
          key={player.id}
          user={player.user}
          displayMenu={displayMenu}
          className="mb-1"
        />
      ))}
    </>
  );
}

function ChatGroupedPlayersList({ players, displayMenu, mode }) {
  const {
    watching: watchingList = [],
    online: onlineList = [],
    lobby: lobbyList = [],
    playing: playingList = [],
    task: builderList = [],
  } = groupBy(players, 'currentState');

  return (
    <>
      <UsersList mode={mode} title="Watching" list={watchingList} displayMenu={displayMenu} />
      <UsersList mode={mode} title="Playing" list={playingList} displayMenu={displayMenu} />
      <UsersList mode={mode} title="Lobby" list={lobbyList} displayMenu={displayMenu} />
      <UsersList mode={mode} title="Online" list={onlineList} displayMenu={displayMenu} />
      <UsersList mode={mode} title="Edit task" list={builderList} displayMenu={displayMenu} />
    </>
  );
}

const chatHeaderClassName = cn(
  'col-lg-8 col-md-8 d-flex flex-column position-relative',
  'p-0 cb-bg-panel rounded-left h-sm-100 cb-lobby-widget-container w-100',
);

function LobbyChat({
  mode = 'dark',
  presenceList,
  setOpenActionModalShowing,
  inputRef,
}) {
  const dispatch = useDispatch();

  const messages = useSelector(selectors.chatMessagesSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);

  const users = useMemo(
    () => presenceList.map(({ user }) => user),
    [presenceList],
  );

  useEffect(() => {
    const channel = dispatch(chatMiddlewares.connectToChat(true, 'channel'));

    return () => {
      if (channel) {
        channel.leave();
      }
    };
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

  return (
    <ChatContextMenu menuId={menuId} inputRef={inputRef} request={menuRequest}>
      <div className="d-flex flex-column flex-lg-row flex-md-row rounded shadow-sm mt-2">
        <div
          className={chatHeaderClassName}
        >
          <ChatHeader mode={mode} disabled={!isOnline} showRooms />
          <Messages className="text-white" displayMenu={displayMenu} messages={filteredMessages} />
          <ChatInput mode={mode} disabled={!isOnline} inputRef={inputRef} />
        </div>
        <div className={
          cn(
            'col-lg-4 col-md-4 p-0 pb-3 pb-sm-4 cb-bg-panel cb-players-container',
            'border-left cb-border-color rounded-right',
          )
        }
        >
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
                  className="btn btn-sm p-0 cb-rounded mr-1"
                  onClick={openSendMessageModal}
                  disabled={!isOnline || presenceList.length <= 1}
                >
                  <FontAwesomeIcon
                    title="Send message"
                    className="text-white"
                    icon={faEnvelope}
                  />
                </button>
                <button
                  type="button"
                  className="btn btn-sm p-0 cb-rounded"
                  onClick={openSendInviteModal}
                  disabled={!isOnline || presenceList.length <= 1}
                >
                  <img
                    title="Send fight invite"
                    alt="fight"
                    style={{ width: '16px', height: '16px' }}
                    src="/assets/images/fight.svg"
                  />
                </button>
              </div>
            </div>
            <div className="d-flex px-3 flex-column align-items-start overflow-auto">
              <ChatGroupedPlayersList
                mode={mode}
                players={presenceList}
                displayMenu={displayMenu}
              />
            </div>
          </div>
        </div>
      </div>
    </ChatContextMenu>
  );
}

export default memo(LobbyChat);
