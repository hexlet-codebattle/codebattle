import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import cn from 'classnames';
import Gon from 'gon';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import sortBy from 'lodash/sortBy';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import GameLevelBadge from '../../components/GameLevelBadge';
import HorizontalScrollControls from '../../components/SideScrollControls';
import gameStateCodes from '../../config/gameStateCodes';
import hashLinkNames from '../../config/hashLinkNames';
import levelRatio from '../../config/levelRatio';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import { getLobbyUrl, makeGameUrl } from '../../utils/urlBuilders';

import Announcement from './Announcement';
import ChatActionModal from './ChatActionModal';
import CompletedGames from './CompletedGames';
import CompletedTournaments from './CompletedTournaments';
import CreateGameDialog from './CreateGameDialog';
import GameActionButton from './GameActionButton';
import GameCard from './GameCard';
import GameStateBadge from './GameStateBadge';
import Leaderboard from './Leaderboard';
import LiveTournaments from './LiveTournaments';
import LobbyChat from './LobbyChat';
import Players from './Players';

const isActiveGame = game => [gameStateCodes.playing, gameStateCodes.waitingOpponent].includes(game.state);

const ActiveGames = ({
  games, currentUserId, isGuest, isOnline,
}) => {
  if (!games) {
    return null;
  }

  const filterGames = game => {
    if (game.visibilityType === 'hidden') {
      return !!find(game.players, { id: currentUserId });
    }
    return true;
  };
  const filtetedGames = games.filter(filterGames);

  if (isEmpty(filtetedGames)) {
    return <p className="text-center">There are no active games right now.</p>;
  }

  const gamesSortByLevel = sortBy(filtetedGames, [
    game => levelRatio[game.level],
  ]);

  const {
    gamesWithCurrentUser = [],
    gamesWithActiveUsers = [],
    gamesWithBots = [],
  } = groupBy(gamesSortByLevel, game => {
    const isCurrentUserPlay = game.players.some(
      ({ id }) => id === currentUserId,
    );
    if (isCurrentUserPlay) {
      return 'gamesWithCurrentUser';
    }
    if (!game.isBot) {
      return 'gamesWithActiveUsers';
    }
    return 'gamesWithBots';
  });

  const sortedGames = [
    ...gamesWithCurrentUser,
    ...gamesWithActiveUsers,
    ...gamesWithBots,
  ];

  return (
    <>
      <div className="d-none d-md-block table-responsive rounded-bottom">
        <table className="table table-striped mb-0">
          <thead className="text-center">
            <tr>
              <th className="p-3 border-0">Level</th>
              <th className="p-3 border-0">State</th>
              <th className="p-3 border-0 text-center" colSpan={2}>
                Players
              </th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.map(
              game => isActiveGame(game) && (
                <tr key={game.id} className="text-dark game-item">
                  <td className="p-3 align-middle text-nowrap">
                    <GameLevelBadge level={game.level} />
                  </td>
                  <td className="p-3 align-middle text-center text-nowrap">
                    <GameStateBadge state={game.state} />
                  </td>
                  <Players
                    gameId={game.id}
                    players={game.players}
                    isBot={game.isBot}
                  />
                  <td className="p-3 align-middle text-center">
                    <GameActionButton
                      type="table"
                      game={game}
                      currentUserId={currentUserId}
                      isGuest={isGuest}
                      isOnline={isOnline}
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      <HorizontalScrollControls className="d-md-none m-2">
        {sortedGames.map(game => isActiveGame(game) && (
          <GameCard
            key={`card-${game.id}`}
            type="active"
            game={game}
            currentUserId={currentUserId}
            isGuest={isGuest}
            isOnline={isOnline}
          />
        ))}
      </HorizontalScrollControls>
    </>
  );
};

const getTabLinkClassName = (...hash) => {
  const url = new URL(window.location);
  const isActive = hash.includes(url.hash || '#lobby');

  return cn(
    'nav-item nav-link text-uppercase text-center text-nowrap rounded-0 font-weight-bold p-3 border-0 w-100',
    {
      active: isActive,
    },
  );
};

const tabContentClassName = (...hash) => {
  const url = new URL(window.location);

  return cn({
    'tab-pane': true,
    fade: true,
    active: hash.includes(url.hash || '#lobby'),
    show: hash.includes(url.hash || '#lobby'),
  });
};

const getTabLinkHandler = hash => () => {
  window.location.hash = hash;
};

const navTabsClassName = cn(
  'nav nav-tabs flex-nowrap cb-overflow-x-auto cb-overflow-y-hidden',
  'rounded-top border-bottom',
);

const LobbyContainer = ({
  activeGames,
  liveTournaments,
  completedTournaments,
  currentUserId,
  isGuest = true,
  isOnline = false,
}) => {
  const handleClick = useCallback(e => {
    const { currentTarget: { dataset } } = e;
    getTabLinkHandler(dataset.hash)();
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      getTabLinkHandler(hashLinkNames.default)();
      window.scrollTo({ top: 0 });
    }
  }, []);

  return (
    <div className="p-0 shadow-sm rounded-lg">
      <nav>
        <div
          id="nav-tab"
          className={navTabsClassName}
          role="tablist"
        >
          <a
            className={getTabLinkClassName(
              hashLinkNames.lobby,
              hashLinkNames.default,
            )}
            id="lobby-tab"
            data-toggle="tab"
            data-hash={hashLinkNames.lobby}
            href="#lobby"
            role="tab"
            aria-controls="lobby"
            aria-selected="true"
            onClick={handleClick}
          >
            Lobby
          </a>
          <a
            className={getTabLinkClassName(
              hashLinkNames.tournaments,
            )}
            id="tournaments-tab"
            data-toggle="tab"
            data-hash={hashLinkNames.tournaments}
            href="#tournaments"
            role="tab"
            aria-controls="tournaments"
            aria-selected="false"
            onClick={handleClick}
          >
            Tournaments
          </a>
          <a
            className={getTabLinkClassName(
              hashLinkNames.completedGames,
            )}
            id="completedGames-tab"
            data-toggle="tab"
            data-hash={hashLinkNames.completedGames}
            href="#completedGames"
            role="tab"
            aria-controls="completedGames"
            aria-selected="false"
            onClick={handleClick}
          >
            History
          </a>
        </div>
      </nav>
      <div className="tab-content" id="nav-tabContent">
        <div
          className={tabContentClassName(
            hashLinkNames.lobby,
            hashLinkNames.default,
          )}
          id="lobby"
          role="tabpanel"
          aria-labelledby="lobby-tab"
        >
          <ActiveGames
            games={activeGames}
            currentUserId={currentUserId}
            isGuest={isGuest}
            isOnline={isOnline}
          />
        </div>
        <div
          className={tabContentClassName(hashLinkNames.tournaments)}
          id="tournaments"
          role="tabpanel"
          aria-labelledby="tournaments-tab"
        >
          <LiveTournaments tournaments={liveTournaments} />
          <CompletedTournaments tournaments={completedTournaments} />
        </div>
        <div
          className={tabContentClassName(hashLinkNames.completedGames)}
          id="completedGames"
          role="tabpanel"
          aria-labelledby="completedGames-tab"
        >
          <CompletedGames className="cb-lobby-widget-container" />
        </div>
      </div>
    </div>
  );
};

const createBtnClassName = cn(
  'btn border-0 rounded-lg',
  'text-uppercase font-weight-bold py-3',
);

const createBasicGameBtnClassName = cn(
  createBtnClassName,
 'btn-success',
);

const createCssGameBtnClassName = cn(
  createBtnClassName,
 'btn-secondary mt-2',
);

const CreateCssGameButton = ({ onClick, isOnline }) => (
  <button
    type="button"
    className={createCssGameBtnClassName}
    onClick={onClick}
    disabled={!isOnline}
  >
    Create a CSS Game
  </button>
);

const CreateGameButton = ({ onClick, isOnline, isContinue }) => (
  <button
    type="button"
    className={createBasicGameBtnClassName}
    onClick={onClick}
    disabled={!isOnline}
  >
    {isContinue ? 'Continue' : 'Create a Game'}
  </button>
);

const LobbyWidget = () => {
  const currentOpponent = Gon.getAsset('opponent');

  const dispatch = useDispatch();

  const chatInputRef = useRef(null);

  const [actionModalShowing, setActionModalShowing] = useState({ opened: false });

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const showCreateGameModal = useSelector(selectors.isModalShow);
  const activeGame = useSelector(selectors.activeGameSelector);
  const {
    activeGames,
    liveTournaments,
    completedTournaments,
    presenceList,
    channel: { online },
  } = useSelector(selectors.lobbyDataSelector);

  // const showCssGameButton = !!activeGame && isAdmin;
  const showCssGameButton = false;

  const handleShowCreateGameModal = useCallback(
    () => dispatch(actions.showCreateGameModal()),
    [dispatch],
  );
  const handleCloseCreateGameModal = useCallback(
    () => dispatch(actions.closeCreateGameModal()),
    [dispatch],
  );

  const handleCreateGameBtnClick = useCallback(() => {
    if (activeGame) {
      window.location.href = makeGameUrl(activeGame.id);
    } else {
      handleShowCreateGameModal();
    }
  }, [activeGame, handleShowCreateGameModal]);
  const handleCreateCssGameBtnClick = useCallback(() => {
    if (isAdmin) {
      lobbyMiddlewares.createCssGame({});
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
    <div className="container-lg">
      <Modal show={showCreateGameModal} onHide={handleCloseCreateGameModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create a game</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CreateGameDialog hideModal={handleCloseCreateGameModal} />
        </Modal.Body>
      </Modal>
      <ChatActionModal
        presenceList={presenceList}
        chatInputRef={chatInputRef}
        modalShowing={actionModalShowing}
        setModalShowing={setActionModalShowing}
      />
      <div className="row">
        <div className="d-flex flex-column col-12 col-lg-8 p-0 mb-2 pr-lg-2">
          <div className="d-none d-lg-none d-flex flex-column mb-2">
            <CreateGameButton onClick={handleCreateGameBtnClick} isOnline={online} isContinue={!!activeGame} />
            {showCssGameButton && <CreateCssGameButton onClick={handleCreateCssGameBtnClick} isOnline={online} />}
          </div>
          <LobbyContainer
            activeGames={activeGames}
            liveTournaments={liveTournaments}
            completedTournaments={completedTournaments}
            currentUserId={currentUserId}
            isGuest={isGuest}
            isOnline={online}
          />
          <LobbyChat
            setOpenActionModalShowing={setActionModalShowing}
            presenceList={presenceList}
            inputRef={chatInputRef}
          />
        </div>

        <div className="d-flex flex-column col-12 col-lg-4 p-0">
          <div className="d-none d-sm-none d-md-none d-lg-block">
            <div className="d-flex flex-column">
              <CreateGameButton onClick={handleCreateGameBtnClick} isOnline={online} isContinue={!!activeGame} />
              {showCssGameButton && <CreateCssGameButton onClick={handleCreateCssGameBtnClick} isOnline={online} />}
            </div>
          </div>
          <div className="mt-2">
            <Announcement />
          </div>
          <div className="mt-2">
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyWidget;
