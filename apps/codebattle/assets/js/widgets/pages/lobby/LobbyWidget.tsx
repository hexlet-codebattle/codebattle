import React, { useState, useRef, useEffect, useCallback } from 'react';

import { Box, Button, Flex } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '@/components/CbModal';
import { getPageProp } from '@/inertia/pageProps';
import * as lobbyMiddlewares from '@/middlewares/Lobby';
import * as selectors from '@/selectors';
import { actions, type AppDispatch } from '@/slices';
import { getLobbyUrl, makeGameUrl } from '@/utils/urlBuilders';
import useLobbyModals from '@/utils/useLobbyModals';

import i18n from '../../../i18n';
import ActiveGames from './ActiveGames';
import Announcement from './Announcement';
import ChatActionModal from './ChatActionModal';
import CreateGameDialog from './CreateGameDialog';
import { type LobbyGame } from './GameActionButton';
import LobbyChat from './LobbyChat';
import SeasonProfilePanel from './SeasonProfilePanel';
import { type LobbyTournament } from './TournamentCard';

interface CreateExperimentalGameButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isOnline?: boolean;
  type?: string;
}

function CreateExperimentalGameButton({
  onClick,
  isOnline,
  type = 'css',
}: CreateExperimentalGameButtonProps) {
  return (
    <Button
      color="cbSecondary"
      mt="sm"
      pl="sm"
      data-type={type}
      onClick={onClick}
      disabled={!isOnline}
    >
      {type === 'css' ? i18n.t('Create a CSS Game') : i18n.t('Create a SQL Game')}
    </Button>
  );
}

interface JoinGameButtonProps {
  onClick: () => void;
}

function JoinGameButton({ onClick }: JoinGameButtonProps) {
  return (
    <Button color="cbSecondary" fullWidth onClick={onClick}>
      {i18n.t('Join a battle')}
    </Button>
  );
}

interface CreateGameButtonProps {
  onClick: () => void;
  isOnline?: boolean;
  isContinue?: boolean;
}

function CreateGameButton({ onClick, isOnline, isContinue }: CreateGameButtonProps) {
  return (
    <Button color="cbSecondary" fullWidth mr="sm" onClick={onClick} disabled={!isOnline}>
      {isContinue ? i18n.t('Continue battle') : i18n.t('Create a battle')}
    </Button>
  );
}

interface CurrentOpponent {
  id: number;
  name: string;
}

interface ModalShowingState {
  opened: boolean;
  action?: string;
}

function LobbyWidget() {
  const currentOpponent = getPageProp<CurrentOpponent | null>('opponent', null);

  const dispatch = useDispatch<AppDispatch>();

  const chatInputRef = useRef<HTMLInputElement>(null);

  const [actionModalShowing, setActionModalShowing] = useState<ModalShowingState>({
    opened: false,
  });

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const currentUser = useSelector(selectors.currentUserSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const showCreateGameModal = useSelector(selectors.isModalShow);
  const showJoinGameModal = useSelector(selectors.isJoinGameModalShow);
  const activeGame = useSelector(selectors.activeGameSelector);
  const {
    activeGames,
    liveTournaments,
    seasonTournaments,
    // completedTournaments,
    presenceList,
    nearbyUsers,
    channel: { online },
  } = useSelector(selectors.lobbyDataSelector);

  // const showCssGameButton = !!activeGame && isAdmin;
  const hideExperimentGamesButtons = !isAdmin;

  const handleShowCreateGameModal = useCallback(
    () => dispatch(actions.showCreateGameModal()),
    [dispatch],
  );
  const handleCloseCreateGameModal = useCallback(
    () => dispatch(actions.closeCreateGameModal()),
    [dispatch],
  );
  const handleJoinGameBtnClick = useCallback(
    () => dispatch(actions.showJoinGameModal()),
    [dispatch],
  );
  const handleCloseJoinGameModal = useCallback(
    () => dispatch(actions.closeJoinGameModal()),
    [dispatch],
  );

  const handleCreateGameBtnClick = useCallback(() => {
    if (activeGame) {
      window.location.href = makeGameUrl(activeGame.id);
    } else {
      handleShowCreateGameModal();
    }
  }, [activeGame, handleShowCreateGameModal]);
  const handleExperimentalGameBtnClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const type = event.currentTarget.dataset.type || 'css';

      if (isAdmin) {
        lobbyMiddlewares.createExperimentGame({ type });
      }
    },
    [isAdmin],
  );

  useEffect(() => {
    const waitingGameId = activeGame?.state === 'waiting_opponent' ? activeGame.id : undefined;
    const channel = lobbyMiddlewares.fetchState(currentUserId ?? 0, waitingGameId)(dispatch);

    if (currentOpponent) {
      window.history.replaceState({}, document.title, getLobbyUrl());
      dispatch(
        actions.showCreateGameInviteModal({
          opponentInfo: { id: currentOpponent.id, name: currentOpponent.name },
        }),
      );
    }

    return () => {
      if (channel) {
        channel.leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLobbyModals();

  return (
    <div>
      <Modal show={showCreateGameModal} onHide={handleCloseCreateGameModal}>
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>{i18n.t('Create a game')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CreateGameDialog hideModal={handleCloseCreateGameModal} />
        </Modal.Body>
      </Modal>
      <Modal
        show={showJoinGameModal}
        onHide={handleCloseJoinGameModal}
        dialogClassName="cb-join-game-modal"
      >
        <Modal.Header className="cb-border-color" closeButton>
          <Modal.Title>{i18n.t('Join a game')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ActiveGames
            games={activeGames as unknown as LobbyGame[]}
            currentUserId={currentUserId ?? 0}
            isGuest={isGuest}
            isOnline={online}
          />
        </Modal.Body>
      </Modal>
      <ChatActionModal
        presenceList={presenceList as React.ComponentProps<typeof ChatActionModal>['presenceList']}
        chatInputRef={chatInputRef}
        modalShowing={actionModalShowing}
        setModalShowing={setActionModalShowing}
      />
      <SeasonProfilePanel
        liveTournaments={liveTournaments as unknown as LobbyTournament[]}
        seasonTournaments={seasonTournaments as unknown as LobbyTournament[]}
        user={currentUser as React.ComponentProps<typeof SeasonProfilePanel>['user']}
        nearbyUsers={nearbyUsers as number[]}
        controls={
          <Flex direction="column" mt="sm" className="cb-lobby-controls">
            <Flex w="100%" className="cb-lobby-controls-primary">
              <CreateGameButton
                onClick={handleCreateGameBtnClick}
                isOnline={online}
                isContinue={!!activeGame}
              />
              <JoinGameButton onClick={handleJoinGameBtnClick} />
            </Flex>
            {!hideExperimentGamesButtons && (
              <>
                <CreateExperimentalGameButton
                  type="css"
                  onClick={handleExperimentalGameBtnClick}
                  isOnline={online}
                />
                <CreateExperimentalGameButton
                  type="sql"
                  onClick={handleExperimentalGameBtnClick}
                  isOnline={online}
                />
              </>
            )}
          </Flex>
        }
      />

      <Flex direction={{ base: 'column', lg: 'row' }} p={0} className="cb-lobby-bottom-layout">
        <Box w={{ base: '100%', lg: '66.6667%' }} p={0} pr={{ base: 0, lg: 'sm' }}>
          <LobbyChat
            setOpenActionModalShowing={setActionModalShowing}
            presenceList={presenceList as React.ComponentProps<typeof LobbyChat>['presenceList']}
            inputRef={chatInputRef}
          />
        </Box>
        <Box w={{ base: '100%', lg: '33.3333%' }} p={0} pl={{ base: 0, lg: 'sm' }}>
          <Box mt="sm">
            <Announcement />
          </Box>
        </Box>
      </Flex>
    </div>
  );
}

export default LobbyWidget;
