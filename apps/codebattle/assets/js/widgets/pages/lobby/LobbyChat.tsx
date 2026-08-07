import React, { memo, useEffect, useMemo, useCallback } from 'react';

import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ActionIcon, Box, Flex, Text } from '@mantine/core';
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
        <Box mb="xs" key={player.id}>
          <ChatUserInfo
            mode={mode}
            user={player.user}
            displayMenu={displayMenu as ChatUserInfoDisplayMenu}
          />
        </Box>
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
      <UsersList
        mode={mode}
        title={i18n.t('Watching')}
        list={watchingList}
        displayMenu={displayMenu}
      />
      <UsersList
        mode={mode}
        title={i18n.t('Playing')}
        list={playingList}
        displayMenu={displayMenu}
      />
      <UsersList mode={mode} title={i18n.t('Lobby')} list={lobbyList} displayMenu={displayMenu} />
      <UsersList mode={mode} title={i18n.t('Online')} list={onlineList} displayMenu={displayMenu} />
      <UsersList
        mode={mode}
        title={i18n.t('Edit task')}
        list={builderList}
        displayMenu={displayMenu}
      />
    </>
  );
}

const chatHeaderClassName = 'rounded-left h-sm-100 cb-lobby-widget-container cb-lobby-chat-main';

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
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

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
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        mt="sm"
        className="cb-bg-panel cb-rounded shadow-sm cb-lobby-chat-card"
      >
        <Flex direction="column" pos="relative" p={0} w="100%" className={chatHeaderClassName}>
          <ChatHeader disabled={!isOnline} showRooms />
          <Messages
            className="text-white"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            displayMenu={displayMenu as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            messages={filteredMessages as any}
            currentUserId={currentUserId}
            onDeleteMessage={chatMiddlewares.deleteMessage}
            canDeleteAny={currentUserIsAdmin}
          />
          <ChatInput
            mode={mode}
            disabled={!isOnline}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
          />
        </Flex>
        <Box
          p={0}
          pb="md"
          className="pb-sm-4 cb-players-container border-left cb-border-color rounded-right cb-lobby-chat-sidebar"
        >
          <Flex direction="column" h="100%">
            <Flex justify="space-between">
              {isOnline ? (
                <Text px="md" pt="sm" mb="sm" className="text-nowrap">
                  {i18n.t('Online players: %{count}', { count: presenceList.length })}
                </Text>
              ) : (
                <Box px="md" pt="sm" mb="sm" className="text-nowrap">
                  <Loading adaptive />
                </Box>
              )}
              <Flex p="sm" className="justify-items-center">
                <ActionIcon
                  variant="transparent"
                  c="white"
                  p={0}
                  mr="xs"
                  onClick={openSendMessageModal}
                  disabled={!isOnline || presenceList.length <= 1}
                  aria-label={i18n.t('Send message')}
                  title={i18n.t('Send message')}
                  className="cb-lobby-chat-action"
                >
                  <FontAwesomeIcon aria-hidden="true" icon={faEnvelope} />
                </ActionIcon>
                <ActionIcon
                  variant="transparent"
                  p={0}
                  onClick={openSendInviteModal}
                  disabled={!isOnline || presenceList.length <= 1}
                  aria-label={i18n.t('Send fight invite')}
                  title={i18n.t('Send fight invite')}
                  className="cb-lobby-chat-action"
                >
                  <img
                    alt=""
                    aria-hidden="true"
                    style={{ width: '16px', height: '16px' }}
                    src={fightSvg}
                  />
                </ActionIcon>
              </Flex>
            </Flex>
            <Flex direction="column" px="md" align="flex-start" className="overflow-auto">
              <ChatGroupedPlayersList
                mode={mode}
                players={presenceList}
                displayMenu={displayMenu}
              />
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </ChatContextMenu>
  );
}

export default memo(LobbyChat);
