import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import _ from 'lodash';
import copy from 'copy-to-clipboard';
import moment from 'moment';

import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
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
import TopPlayersEver from '../components/TopPlayers/TopPlayersEver';
import TopPlayersPerPeriod from '../components/TopPlayers/TopPlayersPerPeriod';
import GameLevelBadge from '../components/GameLevelBadge';
import levelRatio from '../config/levelRatio';

const Players = ({ players }) => {
  if (players.length === 1) {
    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <UserInfo user={players[0]} />
        </div>
      </td>
    );
  }
  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex align-items-center">
          <UserInfo user={players[0]} />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex align-items-center">
          <UserInfo user={players[1]} />
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
        <p className="mb-0">There are no active tournaments right now</p>
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
  const gamesSortByLevel = _.sortBy(filtetedGames, [game => levelRatio[game.level]]);
  const { gamesWithCurrentUser = [], gamesWithActiveUsers = [], gamesWithBots = [] } = _.groupBy(gamesSortByLevel, game => {
    const isCurrentUserPlay = game.players.some(({ id }) => id === currentUser.id);
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
          {sortedGames.map(game => (
            <tr key={game.id} className="text-dark game-item">
              <td className="p-3 align-middle text-nowrap">
                <GameLevelBadge level={game.level} />
              </td>
              <td className="p-3 align-middle text-center text-nowrap">
                <img
                  alt={game.state}
                  src={
                    game.state === 'playing'
                      ? '/assets/images/playing.svg'
                      : '/assets/images/waitingOpponent.svg'
                  }
                />
              </td>
              <Players gameId={game.id} players={game.players} />
              <td className="p-3 align-middle text-center">
                <GameActionButton game={game} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const GameContainers = ({
  activeGames,
  completedGames,
  liveTournaments,
  handleShowModal,
}) => (
  <div className="p-0">
    <nav>
      <div className="nav nav-tabs bg-gray" id="nav-tab" role="tablist">
        <a
          className="nav-item nav-link active text-uppercase rounded-0 text-black font-weight-bold p-3"
          id="lobby-tab"
          data-toggle="tab"
          href="#lobby"
          role="tab"
          aria-controls="lobby"
          aria-selected="true"
        >
          Lobby
        </a>
        <a
          className="nav-item nav-link text-uppercase rounded-0 text-black font-weight-bold p-3"
          id="tournaments-tab"
          data-toggle="tab"
          href="#tournaments"
          role="tab"
          aria-controls="tournaments"
          aria-selected="false"
        >
          Tournaments
        </a>
        <a
          className="nav-item nav-link text-uppercase rounded-0 text-black font-weight-bold p-3"
          id="completedGames-tab"
          data-toggle="tab"
          href="#completedGames"
          role="tab"
          aria-controls="completedGames"
          aria-selected="false"
        >
          Completed Games
        </a>
        <button
          type="button"
          className="nav-item nav-link text-uppercase rounded-0 text-orange font-weight-bold p-3 ml-auto"
          onClick={handleShowModal}
        >
          Create Game
        </button>
      </div>
    </nav>
    <div className="tab-content" id="nav-tabContent">
      <div
        className="tab-pane fade show active"
        id="lobby"
        role="tabpanel"
        aria-labelledby="lobby-tab"
      >
        <ActiveGames games={activeGames} />
      </div>
      <div
        className="tab-pane fade"
        id="tournaments"
        role="tabpanel"
        aria-labelledby="tournaments-tab"
      >
        <LiveTournaments tournaments={liveTournaments} />
      </div>
      <div
        className="tab-pane fade"
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
      <Modal.Title>Create game</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <CreateGameDialog hideModal={handleCloseModal} />
    </Modal.Body>
  </Modal>
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
  } = useSelector(state => selectors.gameListSelector(state));

  if (!loaded) {
    return <Loading />;
  }

  return (
    <div className="container-lg">
      {renderModal(show, handleCloseModal)}
      <div className="row">
        {/* {isGuestCurrentUser ? <Intro /> : <StartGamePanel />} */}
        <div className="col-sm-9 p-0">
          <GameContainers
            activeGames={activeGames}
            completedGames={completedGames}
            liveTournaments={liveTournaments}
            handleShowModal={handleShowModal}
          />
        </div>

        <div className="d-flex flex-column col-sm-3">
          <TopPlayersPerPeriod />
          <div className="mt-2">
            <TopPlayersEver />
          </div>
          <div className="mt-2">
            <a
              href="https://codebattle.hexlet.io/users"
              className="btn btn-sm btn-outline-orange"
            >
              More
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyWidget;
