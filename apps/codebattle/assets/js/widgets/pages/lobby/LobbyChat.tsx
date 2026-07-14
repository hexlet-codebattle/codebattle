import React, { memo, useEffect, useMemo, useCallback } from 'react';

import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import groupBy from 'lodash/groupBy';
import { useDispatch, useSelector } from 'react-redux';

import i18n from '../../../i18n';
import ChatContextMenu from '../../components/ChatContextMenu';
import ChatHeader from '../../components/ChatHeader';
import ChatInput from '../../components/ChatInput';
import ChatUserInfo from '../../components/ChatUserInfo';
import Loading from '../../components/Loading';
import Messages from '../../components/Messages';
import { type UserNameUser } from '../../components/UserName';
import * as chatMiddlewares from '../../middlewares/Chat';
import * as selectors from '../../selectors';
import { type AppDispatch } from '../../slices';
import { shouldShowMessage } from '../../utils/chat';
import useChatContextMenu from '../../utils/useChatContextMenu';
import useChatRooms from '../../utils/useChatRooms';

const fightSvg = '/assets/images/fight.svg';

type DisplayMenu = (event: React.MouseEvent<HTMLElement>) => void;
type ChatUserInfoDisplayMenu = (event: React.MouseEvent | React.KeyboardEvent) => void;

interface ChatPlayer {
  id: number;
  user: UserNameUser;
  currentState?: string;
}

interface UsersListProps {
  list: ChatPlayer[];
  title: string;
  displayMenu: DisplayMenu;
  mode?: string;
}

function UsersList({ list, title, displayMenu, mode }: UsersListProps) {
  return (
    <>
      {list.length !== 0 && <div>{`${i18n.t(title)}: `}</div>}
      {list.map((player) => (
        <ChatUserInfo
          mode={mode}
          key={player.id}
          user={player.user}
          displayMenu={displayMenu as ChatUserInfoDisplayMenu}
          className="mb-1"
        />
      ))}
    </>
  );
}

interface ChatGroupedPlayersListProps {
  players: ChatPlayer[];
  displayMenu: DisplayMenu;
  mode?: string;
}

function ChatGroupedPlayersList({ players, displayMenu, mode }: ChatGroupedPlayersListProps) {
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
  'd-flex flex-column position-relative',
  'p-0 rounded-left h-sm-100 cb-lobby-widget-container w-100',
  'cb-lobby-chat-main',
);

interface ModalShowingState {
  opened: boolean;
  action?: string;
}

interface LobbyChatProps {
  mode?: string;
  presenceList: ChatPlayer[];
  setOpenActionModalShowing: (state: ModalShowingState) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function LobbyChat({
  mode = 'dark',
  presenceList,
  setOpenActionModalShowing,
  inputRef,
}: LobbyChatProps) {
  const dispatch = useDispatch<AppDispatch>();

  const messages = useSelector(selectors.chatMessagesSelector);
  const isOnline = useSelector(selectors.chatChannelStateSelector);

  const users = useMemo(() => presenceList.map(({ user }) => user), [presenceList]);

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
    users: users.map((user) => ({ ...user, id: Number(user.id) })),
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
  const filteredMessages = messages.filter((message) => shouldShowMessage(message, activeRoom));

  if (!presenceList) {
    return null;
  }

  return (
    <ChatContextMenu
      menuId={menuId}
      inputRef={inputRef as React.RefObject<HTMLInputElement>}
      request={menuRequest}
    >
      <div className="d-flex flex-column flex-lg-row cb-bg-panel cb-rounded shadow-sm mt-2 cb-lobby-chat-card">
        <div className={chatHeaderClassName}>
          <ChatHeader disabled={!isOnline} showRooms />
          <Messages
            className="text-white"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            displayMenu={displayMenu as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages={filteredMessages as any}
          />
          <ChatInput
            mode={mode}
            disabled={!isOnline}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
          />
        </div>
        <div
          className={cn(
            'p-0 pb-3 pb-sm-4 cb-players-container',
            'border-left cb-border-color rounded-right',
            'cb-lobby-chat-sidebar',
          )}
        >
          <div className="d-flex flex-column h-100">
            <div className="d-flex justify-content-between">
              {isOnline ? (
                <p className="px-3 pt-2 mb-2 text-nowrap">
                  {i18n.t('Online players: %{count}', { count: presenceList.length })}
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
                    title={i18n.t('Send message')}
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
                    title={i18n.t('Send fight invite')}
                    alt={i18n.t('fight')}
                    style={{ width: '16px', height: '16px' }}
                    src={fightSvg}
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
