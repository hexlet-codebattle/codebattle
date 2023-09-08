import React, { memo, useState, useRef, useEffect, useCallback } from 'react';

import cn from 'classnames';
import Gon from 'gon';
import find from 'lodash/find';
import groupBy from 'lodash/groupBy';
import isEmpty from 'lodash/isEmpty';
import orderBy from 'lodash/orderBy';
import sortBy from 'lodash/sortBy';
import moment from 'moment';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useDispatch, useSelector } from 'react-redux';

import GameLevelBadge from '../../components/GameLevelBadge';
import HorizontalScrollControls from '../../components/SideScrollControls';
import UserInfo from '../../components/UserInfo';
import gameStateCodes from '../../config/gameStateCodes';
import hashLinkNames from '../../config/hashLinkNames';
import levelRatio from '../../config/levelRatio';
import * as lobbyMiddlewares from '../../middlewares/Lobby';
import * as selectors from '../../selectors';
import { actions } from '../../slices';
import { fetchCompletedGames, loadNextPage } from '../../slices/completedGames';
import { getLobbyUrl, makeGameUrl } from '../../utils/urlBuilders';

import Announcement from './Announcement';
import ChatActionModal from './ChatActionModal';
import CompletedGames from './CompletedGames';
import CreateGameDialog from './CreateGameDialog';
import GameActionButton from './GameActionButton';
import GameCard from './GameCard';
import GameProgressBar from './GameProgressBar';
import GameStateBadge from './GameStateBadge';
import Leaderboard from './Leaderboard';
import LobbyChat from './LobbyChat';
import ShowButton from './ShowButton';
import TournamentCard from './TournamentCard';

const isActiveGame = (game) =>
  [gameStateCodes.playing, gameStateCodes.waitingOpponent].includes(game.state);

const Players = memo(({ gameId, isBot, players }) => {
  if (players.length === 1) {
    const badgeClassName = cn('badge badge-pill ml-2', {
      'badge-secondary': isBot,
      'badge-warning text-white': !isBot,
    });
    const tooltipId = `tooltip-${gameId}-${players[0].id}`;
    const tooltipInfo = isBot
      ? 'No points are awarded - Only for games with other players'
      : 'Points are awarded for winning this game';

    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <UserInfo user={players[0]} />
          <OverlayTrigger
            overlay={<Tooltip id={tooltipId}>{tooltipInfo}</Tooltip>}
            placement="right"
          >
            <span className={badgeClassName}>{isBot ? 'No rating' : 'Rating'}</span>
          </OverlayTrigger>
        </div>
      </td>
    );
  }

  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo
            hideOnlineIndicator
            loading={players[0].checkResult.status === 'started'}
            user={players[0]}
          />
          <GameProgressBar player={players[0]} position="left" />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo
            hideOnlineIndicator
            loading={players[1].checkResult.status === 'started'}
            user={players[1]}
          />
          <GameProgressBar player={players[1]} position="right" />
        </div>
      </td>
    </>
  );
});

function LiveTournaments({ tournaments }) {
  if (isEmpty(tournaments)) {
    return (
      <div className="text-center">
        <h3 className="mb-0 mt-3">There are no active tournaments right now</h3>
        <a href="/tournaments/#create">
          <u>You may want to create one</u>
        </a>
      </div>
    );
  }

  const sortedTournaments = orderBy(tournaments, 'startsAt', 'desc');

  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">Live tournaments</h2>
      <div className="d-none d-sm-none d-md-block table-responsive rounded-bottom">
        <table className="table table-striped">
          <thead className="">
            <tr>
              <th className="p-3 border-0">Title</th>
              <th className="p-3 border-0">Starts_at</th>
              <th className="p-3 border-0">Creator</th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody className="">
            {sortedTournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle">{tournament.name}</td>
                <td className="p-3 align-middle text-nowrap">
                  {moment.utc(tournament.startsAt).local().format('YYYY-MM-DD HH:mm')}
                </td>
                <td className="p-3 align-middle text-nowrap">
                  <UserInfo user={tournament.creator} />
                </td>
                <td className="p-3 align-middle">
                  <ShowButton url={`/tournaments/${tournament.id}/`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-none d-sm-block d-md-none d-flex m-2 overflow-auto position-relative">
        <HorizontalScrollControls>
          {sortedTournaments.map((tournament) => (
            <TournamentCard key={`card-${tournament.id}`} tournament={tournament} type="active" />
          ))}
        </HorizontalScrollControls>
      </div>
      <div className="text-center mt-3">
        <a href="/tournaments">
          <u>Tournaments Info</u>
        </a>
      </div>
    </div>
  );
}

function CompletedTournaments({ tournaments }) {
  if (isEmpty(tournaments)) {
    return null;
  }

  const sortedTournaments = orderBy(tournaments, 'startsAt', 'desc');

  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">Completed tournaments</h2>
      <div className="d-none d-sm-none d-md-block table-responsive rounded-bottom">
        <table className="table table-striped">
          <thead className="">
            <tr>
              <th className="p-3 border-0">Title</th>
              <th className="p-3 border-0">Type</th>
              <th className="p-3 border-0">Starts_at</th>
              <th className="p-3 border-0">Creator</th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody className="">
            {sortedTournaments.map((tournament) => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle">{tournament.name}</td>
                <td className="p-3 align-middle">{tournament.type}</td>
                <td className="p-3 align-middle text-nowrap">
                  {moment.utc(tournament.startsAt).local().format('YYYY-MM-DD HH:mm')}
                </td>
                <td className="p-3 align-middle text-nowrap">
                  <UserInfo user={tournament.creator} />
                </td>
                <td className="p-3 align-middle">
                  <ShowButton url={`/tournaments/${tournament.id}/`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-none d-sm-block d-md-none d-flex m-2 overflow-auto position-relative">
        <HorizontalScrollControls>
          {sortedTournaments.map((tournament) => (
            <TournamentCard
              key={`card-${tournament.id}`}
              tournament={tournament}
              type="completed"
            />
          ))}
        </HorizontalScrollControls>
      </div>
    </div>
  );
}

function ActiveGames({ currentUserId, games, isGuest, isOnline }) {
  if (!games) {
    return null;
  }

  const filterGames = (game) => {
    if (game.visibilityType === 'hidden') {
      return !!find(game.players, { id: currentUserId });
    }
    return true;
  };
  const filtetedGames = games.filter(filterGames);

  if (isEmpty(filtetedGames)) {
    return <p className="text-center">There are no active games right now.</p>;
  }

  const gamesSortByLevel = sortBy(filtetedGames, [(game) => levelRatio[game.level]]);

  const {
    gamesWithActiveUsers = [],
    gamesWithBots = [],
    gamesWithCurrentUser = [],
  } = groupBy(gamesSortByLevel, (game) => {
    const isCurrentUserPlay = game.players.some(({ id }) => id === currentUserId);
    if (isCurrentUserPlay) {
      return 'gamesWithCurrentUser';
    }
    if (!game.isBot) {
      return 'gamesWithActiveUsers';
    }
    return 'gamesWithBots';
  });

  const sortedGames = [...gamesWithCurrentUser, ...gamesWithActiveUsers, ...gamesWithBots];

  return (
    <>
      <div className="d-none d-sm-none d-md-block table-responsive rounded-bottom">
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
              (game) =>
                isActiveGame(game) && (
                  <tr key={game.id} className="text-dark game-item">
                    <td className="p-3 align-middle text-nowrap">
                      <GameLevelBadge level={game.level} />
                    </td>
                    <td className="p-3 align-middle text-center text-nowrap">
                      <GameStateBadge state={game.state} />
                    </td>
                    <Players gameId={game.id} isBot={game.isBot} players={game.players} />
                    <td className="p-3 align-middle text-center">
                      <GameActionButton
                        currentUserId={currentUserId}
                        game={game}
                        isGuest={isGuest}
                        isOnline={isOnline}
                        type="table"
                      />
                    </td>
                  </tr>
                ),
            )}
          </tbody>
        </table>
      </div>
      <div className="d-none d-sm-block d-md-none d-flex m-2 position-relative">
        <HorizontalScrollControls>
          {sortedGames.map(
            (game) =>
              isActiveGame(game) && (
                <GameCard
                  key={`card-${game.id}`}
                  currentUserId={currentUserId}
                  game={game}
                  isGuest={isGuest}
                  isOnline={isOnline}
                  type="active"
                />
              ),
          )}
        </HorizontalScrollControls>
      </div>
    </>
  );
}

const tabLinkClassName = (...hash) => {
  const url = new URL(window.location);
  return cn(
    'nav-item nav-link text-uppercase text-nowrap rounded-0 font-weight-bold p-3 border-0',
    { active: hash.includes(url.hash) },
  );
};

const tabContentClassName = (hash) => {
  const url = new URL(window.location);
  return cn({
    'tab-pane': true,
    fade: true,
    active: hash.includes(url.hash),
    show: hash.includes(url.hash),
  });
};

const tabLinkHandler = (hash) => () => {
  window.location.hash = hash;
};

function GameContainers({
  activeGames,
  completedGames,
  completedTournaments,
  currentUserId,
  isGuest = true,
  isOnline = false,
  liveTournaments,
  totalGames,
}) {
  useEffect(() => {
    if (!window.location.hash) {
      tabLinkHandler(hashLinkNames.default)();
      window.scrollTo({ top: 0 });
    }
  }, []);

  return (
    <div className="p-0 shadow-sm rounded-lg">
      <nav>
        <div
          className="nav nav-tabs flex-nowrap cb-overflow-x-auto bg-gray rounded-top border-dark border-bottom"
          id="nav-tab"
          role="tablist"
        >
          <a
            aria-controls="lobby"
            aria-selected="true"
            className={tabLinkClassName(hashLinkNames.lobby, hashLinkNames.default)}
            data-toggle="tab"
            href="#lobby"
            id="lobby-tab"
            role="tab"
            onClick={tabLinkHandler(hashLinkNames.lobby)}
          >
            Lobby
          </a>
          <a
            aria-controls="tournaments"
            aria-selected="false"
            className={tabLinkClassName(hashLinkNames.tournaments)}
            data-toggle="tab"
            href="#tournaments"
            id="tournaments-tab"
            role="tab"
            onClick={tabLinkHandler(hashLinkNames.tournaments)}
          >
            Tournaments
          </a>
          <a
            aria-controls="completedGames"
            aria-selected="false"
            className={tabLinkClassName(hashLinkNames.completedGames)}
            data-toggle="tab"
            href="#completedGames"
            id="completedGames-tab"
            role="tab"
            onClick={tabLinkHandler(hashLinkNames.completedGames)}
          >
            Completed Games
          </a>
        </div>
      </nav>
      <div className="tab-content" id="nav-tabContent">
        <div
          aria-labelledby="lobby-tab"
          className={tabContentClassName(hashLinkNames.lobby, hashLinkNames.default)}
          id="lobby"
          role="tabpanel"
        >
          <ActiveGames
            currentUserId={currentUserId}
            games={activeGames}
            isGuest={isGuest}
            isOnline={isOnline}
          />
        </div>
        <div
          aria-labelledby="tournaments-tab"
          className={tabContentClassName(hashLinkNames.tournaments)}
          id="tournaments"
          role="tabpanel"
        >
          <LiveTournaments tournaments={liveTournaments} />
          <CompletedTournaments tournaments={completedTournaments} />
        </div>
        <div
          aria-labelledby="completedGames-tab"
          className={tabContentClassName(hashLinkNames.completedGames)}
          id="completedGames"
          role="tabpanel"
        >
          <CompletedGames
            className="table-responsive scroll cb-lobby-widget-container"
            games={completedGames}
            loadNextPage={loadNextPage}
            totalGames={totalGames}
            type="completed"
          />
        </div>
      </div>
    </div>
  );
}

const renderModal = (show, handleCloseModal) => (
  <Modal show={show} onHide={handleCloseModal}>
    <Modal.Header closeButton>
      <Modal.Title>Create a game</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <CreateGameDialog hideModal={handleCloseModal} />
    </Modal.Body>
  </Modal>
);

function CreateGameButton({ isContinue, isOnline, onClick }) {
  return (
    <button
      className="btn btn-success border-0 text-uppercase font-weight-bold py-3 rounded-lg"
      disabled={!isOnline}
      type="button"
      onClick={onClick}
    >
      {isContinue ? 'Continue' : 'Create a Game'}
    </button>
  );
}

function LobbyWidget() {
  const currentOpponent = Gon.getAsset('opponent');

  const dispatch = useDispatch();

  const chatInputRef = useRef(null);

  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const isGuest = useSelector(selectors.currentUserIsGuestSelector);
  const isModalShow = useSelector(selectors.isModalShow);
  const { completedGames, totalGames } = useSelector(selectors.completedGamesData);
  const activeGame = useSelector(selectors.activeGameSelector);
  const {
    activeGames,
    channel: { online },
    completedTournaments,
    liveTournaments,
    presenceList,
  } = useSelector(selectors.lobbyDataSelector);

  const [actionModalShowing, setActionModalShowing] = useState({ opened: false });

  const handleShowModal = useCallback(() => dispatch(actions.showCreateGameModal()), [dispatch]);
  const handleCloseModal = () => dispatch(actions.closeCreateGameModal());

  const handleCreateGameBtnClick = useCallback(() => {
    if (activeGame) {
      window.location.href = makeGameUrl(activeGame.id);
    } else {
      handleShowModal();
    }
  }, [activeGame, handleShowModal]);

  useEffect(() => {
    const clearLobby = lobbyMiddlewares.fetchState(currentUserId)(dispatch);
    if (currentOpponent) {
      window.history.replaceState({}, document.title, getLobbyUrl());
      dispatch(
        actions.showCreateGameInviteModal({
          opponentInfo: { id: currentOpponent.id, name: currentOpponent.name },
        }),
      );
    }

    return clearLobby;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dispatch(fetchCompletedGames());
  }, [dispatch]);

  return (
    <div className="container-lg">
      {renderModal(isModalShow, handleCloseModal)}
      <ChatActionModal
        chatInputRef={chatInputRef}
        modalShowing={actionModalShowing}
        presenceList={presenceList}
        setModalShowing={setActionModalShowing}
      />
      <div className="row">
        <div className="d-flex flex-column col-12 col-lg-8 p-0 mb-2 pr-lg-2">
          <div className="d-none d-sm-block d-md-none d-flex flex-column mb-2">
            <CreateGameButton
              isContinue={!!activeGame}
              isOnline={online}
              onClick={handleCreateGameBtnClick}
            />
          </div>
          <GameContainers
            activeGames={activeGames}
            completedGames={completedGames}
            completedTournaments={completedTournaments}
            currentUserId={currentUserId}
            isGuest={isGuest}
            isOnline={online}
            liveTournaments={liveTournaments}
            totalGames={totalGames}
          />
          <LobbyChat
            inputRef={chatInputRef}
            presenceList={presenceList}
            setOpenActionModalShowing={setActionModalShowing}
          />
        </div>

        <div className="d-flex flex-column col-12 col-lg-4 p-0">
          <div className="d-none d-sm-none d-md-block">
            <div className="d-flex flex-column">
              <CreateGameButton
                isContinue={!!activeGame}
                isOnline={online}
                onClick={handleCreateGameBtnClick}
              />
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
}

export default LobbyWidget;
