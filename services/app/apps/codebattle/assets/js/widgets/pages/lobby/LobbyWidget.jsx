import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';

import cn from 'classnames';
import Gon from 'gon';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import { getLobbyUrl, makeGameUrl } from '../../utils/urlBuilders';

import ActiveGames from './ActiveGames';
import Announcement from './Announcement';
import ChatActionModal from './ChatActionModal';
import CreateGameDialog from './CreateGameDialog';
import LobbyChat from './LobbyChat';
import SeasonProfilePanel from './SeasonProfilePanel';

const createBtnClassName = cn('btn cb-rounded');

const createBasicGameBtnClassName = cn(
  createBtnClassName,
  'btn-secondary cb-btn-secondary w-100 mr-2',
);

const joinGameBtnClassName = cn(
  createBtnClassName,
  'btn-secondary cb-btn-secondary w-100',
);

const createExperementalGameBtnClassName = cn(
  createBtnClassName,
  'btn-secondary cb-btn-secondary mt-2 pl-2',
);

const CreateExperimentalGameButton = ({ onClick, isOnline, type = 'css' }) => (
  <button
    type="button"
    className={createExperementalGameBtnClassName}
    data-type={type}
    onClick={onClick}
    disabled={!isOnline}
  >
    {type === 'css' ? 'Create a CSS Game' : 'Create a SQL Game'}
  </button>
);

const JoinGameButton = ({ onClick }) => (
  <button type="button" className={joinGameBtnClassName} onClick={onClick}>
    Join a battle
  </button>
);

const CreateGameButton = ({ onClick, isOnline, isContinue }) => (
  <button
    type="button"
    className={createBasicGameBtnClassName}
    onClick={onClick}
    disabled={!isOnline}
  >
    {isContinue ? 'Continue battle' : 'Create a battle'}
  </button>
);

const LobbyWidget = () => {
  const currentOpponent = Gon.getAsset('opponent');

  const dispatch = useDispatch();

  const chatInputRef = useRef(null);

  const [actionModalShowing, setActionModalShowing] = useState({
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
  const handleExperimentalGameBtnClick = useCallback(event => {
    const type = event.currentTarget.dataset.type || 'css';

    if (isAdmin) {
      lobbyMiddlewares.createExperimentGame({ type });
    }
  }, [isAdmin]);

  useEffect(() => {
    const channel = lobbyMiddlewares.fetchState(currentUserId)(dispatch);

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

  return (
    <div>
      <Modal
        show={showCreateGameModal}
        onHide={handleCloseCreateGameModal}
        contentClassName="cb-bg-highlight-panel"
      >
        <Modal.Header className="cb-border-color text-white" closeButton>
          <Modal.Title>Create a game</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-white">
          <CreateGameDialog hideModal={handleCloseCreateGameModal} />
        </Modal.Body>
      </Modal>
      <Modal
        show={showJoinGameModal}
        onHide={handleCloseJoinGameModal}
        contentClassName="cb-bg-highlight-panel cb-join-game-modal"
      >
        <Modal.Header className="cb-border-color text-white" closeButton>
          <Modal.Title>Join a game</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-white">
          <ActiveGames
            games={activeGames}
            currentUserId={currentUserId}
            isGuest={isGuest}
            isOnline={online}
          />
        </Modal.Body>
      </Modal>
      <ChatActionModal
        presenceList={presenceList}
        chatInputRef={chatInputRef}
        modalShowing={actionModalShowing}
        setModalShowing={setActionModalShowing}
      />
      <SeasonProfilePanel
        liveTournaments={liveTournaments}
        seasonTournaments={seasonTournaments}
        user={currentUser}
        controls={(
          <div className="d-flex flex-column mt-2">
            <div className="d-flex w-100">
              <CreateGameButton
                onClick={handleCreateGameBtnClick}
                isOnline={online}
                isContinue={!!activeGame}
              />
              <JoinGameButton onClick={handleJoinGameBtnClick} />
            </div>
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
          </div>
        )}
      />

      <div className="d-flex flex-column flex-lg-row flex-md-row p-0">
        <div className="col-12 col-lg-8">
          <LobbyChat
            setOpenActionModalShowing={setActionModalShowing}
            presenceList={presenceList}
            inputRef={chatInputRef}
          />
        </div>
        <div className="col-12 col-lg-4">
          <div className="mt-2">
            <Announcement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyWidget;
