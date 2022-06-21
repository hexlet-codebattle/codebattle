import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import _ from 'lodash';
import copy from 'copy-to-clipboard';
import moment from 'moment';

import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import classnames from 'classnames';
import * as lobbyMiddlewares from '../middlewares/Lobby';
import gameStatusCodes from '../config/gameStatusCodes';
import { actions } from '../slices';
import * as selectors from '../selectors';
import Loading from '../components/Loading';
// import GamesHeatmap from '../components/GamesHeatmap';
// import Card from '../components/Card';
import UserInfo from './UserInfo';
import { makeCreateGameBotUrl, getSignInGithubUrl } from '../utils/urlBuilders';
import i18n from '../../i18n';
// import StartGamePanel from '../components/StartGamePanel';
import CompletedGames from '../components/Game/CompletedGames';
import CreateGameDialog from '../components/Game/CreateGameDialog';
import Leaderboard from '../components/Leaderboard';
import Announcement from '../components/Announcement';
import GameLevelBadge from '../components/GameLevelBadge';
import LobbyChat from './LobbyChat';
import levelRatio from '../config/levelRatio';
import PlayerLoading from '../components/PlayerLoading';

const isActiveGame = game => [
  gameStatusCodes.playing, gameStatusCodes.waitingOpponent,
].includes(game.state);

const Players = ({ players, checkResults }) => {
  if (players.length === 1) {
    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <UserInfo user={players[0]} />
        </div>
      </td>
    );
  }

  const getBarLength = (assertsCount, successCount) => (successCount / assertsCount) * 100;
  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo user={players[0]} hideOnlineIndicator loading={checkResults[0].status === 'started'} />
          <div className={`cb-check-result-bar ${checkResults[0].status}`}>
            <div
              className="cb-asserts-progress"
              style={{ width: `${getBarLength(checkResults[0]?.assertsCount, checkResults[0]?.successCount)}%` }}
            />
          </div>
          <PlayerLoading show={checkResults[0].status === 'started'} small />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo user={players[1]} hideOnlineIndicator loading={checkResults[1].status === 'started'} />
          <div className={`cb-check-result-bar ${checkResults[1].status}`}>
            <div
              className="cb-asserts-progress"
              style={{
                width: `${getBarLength(checkResults[1]?.assertsCount, checkResults[1]?.successCount)}%`,
                right: 0,
              }}
            />
          </div>
          <PlayerLoading show={checkResults[1].status === 'started'} small />
        </div>
      </td>
    </>
  );
};

const isPlayer = (user, game) => !_.isEmpty(_.find(game.players, { id: user.id }));

const ShowButton = ({ url }) => (
  <a type="button" className="btn btn-outline-orange btn-sm" href={url}>
    Show
  </a>
);

const ContinueButton = ({ url }) => (
  <a type="button" className="btn btn-outline-success btn-sm" href={url}>
    Continue
  </a>
);

const renderButton = (url, type) => {
  const buttons = {
    show: ShowButton,
    continue: ContinueButton,
  };

  const ButtonType = buttons[type];
  return <ButtonType url={url} />;
};

const GameActionButton = ({ game }) => {
  const gameUrl = makeCreateGameBotUrl(game.id);
  const gameUrlJoin = makeCreateGameBotUrl(game.id, 'join');
  const currentUser = Gon.getAsset('current_user');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();

  if (gameState === gameStatusCodes.playing) {
    const type = isPlayer(currentUser, game) ? 'continue' : 'show';
    return renderButton(gameUrl, type);
  }

  if (gameState === gameStatusCodes.waitingOpponent) {
    if (isPlayer(currentUser, game)) {
      return (
        <div className="d-flex justify-content-center">
          <div className="btn-group ml-5">
            <ContinueButton url={gameUrl} />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => copy(`${window.location}${gameUrl}`)}
              data-toggle="tooltip"
              data-placement="right"
              title="Copy link"
            >
              <i className="far fa-copy" />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-hover btn-sm"
            onClick={lobbyMiddlewares.cancelGame(game.id)}
            data-toggle="tooltip"
            data-placement="right"
            title="Cancel game"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      );
    }
    if (currentUser.guest) {
      return (
        <button
          type="button"
          className="btn btn-outline-success btn-sm"
          data-method="get"
          data-to={signInUrl}
        >
          {i18n.t('Sign in with %{name}', { name: 'Github' })}
        </button>
      );
    }
    return (
      <div className="btn-group">
        <button
          type="button"
          className="btn btn-outline-orange btn-sm"
          data-method="post"
          data-csrf={window.csrf_token}
          data-to={gameUrlJoin}
        >
          {i18n.t('Fight')}
        </button>
      </div>
    );
  }

  return null;
};

const LiveTournaments = ({ tournaments }) => {
  if (_.isEmpty(tournaments)) {
    return (
      <div className="text-center">
        <h3 className="mb-0 mt-3">There are no active tournaments right now</h3>
        <a href="/tournaments/#create">
          <u>You may want to create one</u>
        </a>
      </div>
    );
  }
  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">Live tournaments</h2>
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
          {_.orderBy(tournaments, 'startsAt', 'desc').map(tournament => (
            <tr key={tournament.id}>
              <td className="p-3 align-middle">{tournament.name}</td>
              <td className="p-3 align-middle text-nowrap">
                {moment
                  .utc(tournament.startsAt)
                  .local()
                  .format('YYYY-MM-DD HH:mm')}
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
      <div className="text-center mt-5">
        <a href="/tournaments">
          <u>Tournamets Info</u>
        </a>
      </div>
    </div>
  );
};

const CompletedTournaments = ({ tournaments }) => {
  if (_.isEmpty(tournaments)) {
    return null;
  }
  return (
    <div className="table-responsive">
      <h2 className="text-center mt-3">Completed tournaments</h2>
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
          {_.orderBy(tournaments, 'startsAt', 'desc').map(tournament => (
            <tr key={tournament.id}>
              <td className="p-3 align-middle">{tournament.name}</td>
              <td className="p-3 align-middle text-nowrap">
                {moment
                  .utc(tournament.startsAt)
                  .local()
                  .format('YYYY-MM-DD HH:mm')}
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
  );
};

const ActiveGames = ({ games }) => {
  const currentUser = Gon.getAsset('current_user');

  const filterGames = game => {
    if (game.type === 'private') {
      return !!_.find(game.players, { id: currentUser.id });
    }
    return true;
  };
  const filtetedGames = games.filter(filterGames);

  if (_.isEmpty(filtetedGames)) {
    return <p className="text-center">There are no active games right now.</p>;
  }

  const gamesSortByLevel = _.sortBy(filtetedGames, [
    game => levelRatio[game.level],
  ]);
  const {
    gamesWithCurrentUser = [],
    gamesWithActiveUsers = [],
    gamesWithBots = [],
  } = _.groupBy(gamesSortByLevel, game => {
    const isCurrentUserPlay = game.players.some(
      ({ id }) => id === currentUser.id,
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
    <div className="table-responsive">
      <table className="table table-striped border-gray border-top-0 mb-0">
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
          {/*
            TODO: handle game.checkResults

            checkResults[0].status = "ok" | "failure" | "started" | "error"
            checkResults[0].userId

            checkResults <-> players Порядок элементов друг-другу соответствуют

            checkResults[0].status = "failure"
            checkResults[0].assertsCount
            checkResults[0].successCount
          */}
          {sortedGames.map(game => (isActiveGame(game)
            && (
              <tr key={game.id} className="text-dark game-item">
                <td className="p-3 align-middle text-nowrap">
                  <GameLevelBadge level={game.level} />
                </td>
                <td className="p-3 align-middle text-center text-nowrap">
                  <img
                    alt={game.state}
                    title={game.state}
                    src={
                      game.state === 'playing'
                        ? '/assets/images/playing.svg'
                        : '/assets/images/waitingOpponent.svg'
                    }
                  />
                </td>
                <Players gameId={game.id} players={game.players} checkResults={game.checkResults} />
                <td className="p-3 align-middle text-center">
                  <GameActionButton game={game} />
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
};

const tabLinkClassName = (...hash) => {
  const url = new URL(window.location);
  return classnames('nav-item nav-link text-uppercase rounded-0 text-black font-weight-bold p-3', { active: hash.includes(url.hash) });
};

const tabContentClassName = hash => {
  const url = new URL(window.location);
  return classnames({
    'tab-pane': true,
    fade: true,
    active: hash.includes(url.hash),
    show: hash.includes(url.hash),
  });
};

const tabLinkHandler = hash => () => {
  window.location.hash = hash;
};

const GameContainers = ({
  activeGames, completedGames, liveTournaments, completedTournaments,
}) => (
  <div className="p-0">
    <nav>
      <div className="nav nav-tabs bg-gray" id="nav-tab" role="tablist">
        <a
          className={tabLinkClassName('#lobby', '')}
          id="lobby-tab"
          data-toggle="tab"
          href="#lobby"
          role="tab"
          aria-controls="lobby"
          aria-selected="true"
          onClick={tabLinkHandler('#lobby')}
        >
          Lobby
        </a>
        <a
          className={tabLinkClassName('#tournaments')}
          id="tournaments-tab"
          data-toggle="tab"
          href="#tournaments"
          role="tab"
          aria-controls="tournaments"
          aria-selected="false"
          onClick={tabLinkHandler('#tournaments')}
        >
          Tournaments
        </a>
        <a
          className={tabLinkClassName('#completedGames')}
          id="completedGames-tab"
          data-toggle="tab"
          href="#completedGames"
          role="tab"
          aria-controls="completedGames"
          aria-selected="false"
          onClick={tabLinkHandler('#completedGames')}
        >
          Completed Games
        </a>
      </div>
    </nav>
    <div className="tab-content" id="nav-tabContent">
      <div
        className={tabContentClassName('#lobby', '')}
        id="lobby"
        role="tabpanel"
        aria-labelledby="lobby-tab"
      >
        <ActiveGames games={activeGames} />
      </div>
      <div
        className={tabContentClassName('#tournaments')}
        id="tournaments"
        role="tabpanel"
        aria-labelledby="tournaments-tab"
      >
        <LiveTournaments tournaments={liveTournaments} />
        <CompletedTournaments tournaments={completedTournaments} />
      </div>
      <div
        className={tabContentClassName('#completedGames')}
        id="completedGames"
        role="tabpanel"
        aria-labelledby="completedGames-tab"
      >
        <CompletedGames games={completedGames} />
      </div>
    </div>
  </div>
);

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

const CreateGameButton = ({ handleClick }) => (
  <button
    type="button"
    className="btn btn-success text-uppercase font-weight-bold py-3 mb-3"
    onClick={handleClick}
  >
    Create a Game
  </button>
);

const LobbyWidget = () => {
  const currentUser = Gon.getAsset('current_user');
  const dispatch = useDispatch();

  const [show, setShow] = useState(false);
  const handleCloseModal = () => setShow(false);
  const handleShowModal = () => setShow(true);

  useEffect(() => {
    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(lobbyMiddlewares.fetchState());
  }, [currentUser, dispatch]);

  const {
    loaded,
    activeGames,
    completedGames,
    liveTournaments,
    completedTournaments,
  } = useSelector(selectors.lobbyDataSelector);

  if (!loaded) {
    return <Loading />;
  }

  return (
    <div className="container-lg">
      {renderModal(show, handleCloseModal)}
      <div className="row">
        <div className="col-lg-8 col-md-12 p-0 mb-2 pr-lg-2 pb-3">
          <GameContainers
            activeGames={activeGames}
            completedGames={completedGames}
            liveTournaments={liveTournaments}
            completedTournaments={completedTournaments}
          />
          <LobbyChat />
        </div>

        <div className="d-flex flex-column col-lg-4 col-md-12 p-0">
          <CreateGameButton handleClick={handleShowModal} />
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
