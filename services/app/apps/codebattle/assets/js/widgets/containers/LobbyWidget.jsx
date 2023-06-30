import React, { useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import _ from 'lodash';
import copy from 'copy-to-clipboard';
import moment from 'moment';

import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import classnames from 'classnames';
import * as lobbyMiddlewares from '../middlewares/Lobby';
import gameStateCodes from '../config/gameStateCodes';
import { actions } from '../slices';
import * as selectors from '../selectors';
import Loading from '../components/Loading';
// import GamesHeatmap from '../components/GamesHeatmap';
// import Card from '../components/Card';
import UserInfo from './UserInfo';
import {
  makeGameUrl,
  getSignInGithubUrl,
  getLobbyUrl,
} from '../utils/urlBuilders';
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
import hashLinkNames from '../config/hashLinkNames';
import { fetchCompletedGames, loadNextPage } from '../slices/completedGames';

const isActiveGame = game => [gameStateCodes.playing, gameStateCodes.waitingOpponent].includes(game.state);

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

  const getPregressbarWidth = player => `${(player.checkResult?.successCount / player.checkResult?.assertsCount) * 100
    }%`;

  const getPregressbarClass = player => classnames('cb-check-result-bar', player.checkResult.status);

  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo
            user={players[0]}
            hideOnlineIndicator
            loading={players[0].checkResult.status === 'started'}
          />
          <div className={getPregressbarClass(players[0])}>
            <div
              className="cb-asserts-progress"
              style={{ width: getPregressbarWidth(players[0]) }}
            />
          </div>
          <PlayerLoading
            show={players[0].checkResult.status === 'started'}
            small
          />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex flex-column position-relative">
          <UserInfo
            user={players[1]}
            hideOnlineIndicator
            loading={players[1].checkResult.status === 'started'}
          />
          <div className={getPregressbarClass(players[1])}>
            <div
              className="cb-asserts-progress"
              style={{ width: getPregressbarWidth(players[1]), right: 0 }}
            />
          </div>
          <PlayerLoading
            show={players[1].checkResult.status === 'started'}
            small
          />
        </div>
      </td>
    </>
  );
};

const isPlayer = (user, game) => !_.isEmpty(_.find(game.players, { id: user.id }));

const ShowButton = ({ url }) => (
  <a type="button" className="btn w-100 btn-outline-orange btn-sm rounded-lg" href={url}>
    Show
  </a>
);

const ContinueButton = ({ url }) => (
  <a type="button" className="btn w-100 btn-outline-success btn-sm rounded-lg" href={url}>
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
  const gameUrl = makeGameUrl(game.id);
  const gameUrlJoin = makeGameUrl(game.id, 'join');
  const currentUser = Gon.getAsset('current_user');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();

  if (gameState === gameStateCodes.playing) {
    const type = isPlayer(currentUser, game) ? 'continue' : 'show';
    return renderButton(gameUrl, type);
  }

  if (gameState === gameStateCodes.waitingOpponent) {
    if (isPlayer(currentUser, game)) {
      return (
        <div className="d-flex justify-content-center">
          <div className="btn-group w-100 ml-5">
            <ContinueButton url={gameUrl} />
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => copy(`${window.location.host}${gameUrl}`)}
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

    if (currentUser.isGuest) {
      return (
        <button
          type="button"
          className="btn w-100 btn-outline-success btn-sm rounded-lg"
          data-method="get"
          data-to={signInUrl}
        >
          {i18n.t('Sign in with %{name}', { name: 'Github' })}
        </button>
      );
    }

    return (
      <div className="btn-group w-100">
        <button
          type="button"
          className="btn btn-outline-orange btn-sm rounded-lg"
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
          <u>Tournaments Info</u>
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
            <th className="p-3 border-0">Type</th>
            <th className="p-3 border-0">Starts_at</th>
            <th className="p-3 border-0">Creator</th>
            <th className="p-3 border-0">Actions</th>
          </tr>
        </thead>
        <tbody className="">
          {_.orderBy(tournaments, 'startsAt', 'desc').map(tournament => (
            <tr key={tournament.id}>
              <td className="p-3 align-middle">{tournament.name}</td>
              <td className="p-3 align-middle">{tournament.type}</td>
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
  if (!games) {
    return null;
  }

  const currentUser = Gon.getAsset('current_user');

  const filterGames = game => {
    if (game.visibilityType === 'hidden') {
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
    <div className="table-responsive rounded-bottom">
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
                <Players players={game.players} />
                <td className="p-3 align-middle text-center">
                  <GameActionButton game={game} />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
};

const tabLinkClassName = (...hash) => {
  const url = new URL(window.location);
  return classnames(
    'nav-item nav-link text-uppercase rounded-0 font-weight-bold p-3 border-0',
    { active: hash.includes(url.hash) },
  );
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
  activeGames,
  completedGames,
  liveTournaments,
  completedTournaments,
  totalGames,
}) => {
  useEffect(() => {
    if (!window.location.hash) {
      tabLinkHandler(hashLinkNames.default)();
      window.scrollTo({ top: 0 });
    }
  }, []);

  return (
    <div className="p-0 shadow-sm rounded-lg">
      <nav>
        <div className="nav nav-tabs bg-gray border-dark border-bottom d-flex flex-nowrap" id="nav-tab" role="tablist">
          <a
            className={tabLinkClassName(
              hashLinkNames.lobby,
              hashLinkNames.default,
            )}
            id="lobby-tab"
            data-toggle="tab"
            href="#lobby"
            role="tab"
            aria-controls="lobby"
            aria-selected="true"
            onClick={tabLinkHandler(hashLinkNames.lobby)}
          >
            Lobby
          </a>
          <a
            className={tabLinkClassName(hashLinkNames.tournaments)}
            id="tournaments-tab"
            data-toggle="tab"
            href="#tournaments"
            role="tab"
            aria-controls="tournaments"
            aria-selected="false"
            onClick={tabLinkHandler(hashLinkNames.tournaments)}
          >
            Tournaments
          </a>
          <a
            className={tabLinkClassName(hashLinkNames.completedGames)}
            id="completedGames-tab"
            data-toggle="tab"
            href="#completedGames"
            role="tab"
            aria-controls="completedGames"
            aria-selected="false"
            onClick={tabLinkHandler(hashLinkNames.completedGames)}
          >
            Completed Games
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
          <ActiveGames games={activeGames} />
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
          <CompletedGames games={completedGames} loadNextPage={loadNextPage} totalGames={totalGames} />
        </div>
      </div>
    </div>
  );
};

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
    className="btn btn-success border-0 text-uppercase font-weight-bold py-3 mb-sm-3 w-100 mb-1"
    onClick={handleClick}
  >
    Create a Game
  </button>
);

const LobbyWidget = () => {
  const currentUser = Gon.getAsset('current_user');
  const currentOpponent = Gon.getAsset('opponent');
  const isModalShow = useSelector(selectors.isModalShow);
  const dispatch = useDispatch();

  const handleShowModal = () => dispatch(actions.showCreateGameModal());
  const handleCloseModal = () => dispatch(actions.closeCreateGameModal());

  useEffect(() => {
    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(lobbyMiddlewares.fetchState());
    if (currentOpponent) {
      window.history.replaceState({}, document.title, getLobbyUrl());
      dispatch(
        actions.showCreateGameInviteModal({
          opponentInfo: { id: currentOpponent.id, name: currentOpponent.name },
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    dispatch(fetchCompletedGames());
  }, [dispatch]);

  const {
    loaded,
    activeGames,
    liveTournaments,
    completedTournaments,
  } = useSelector(selectors.lobbyDataSelector);

  const { completedGames, totalGames } = useSelector(selectors.completedGamesData);

  if (!loaded) {
    return <Loading />;
  }

  return (
    <div className="container-lg">
      {renderModal(isModalShow, handleCloseModal)}
      <div className="row">

        <div className="col-lg-8 col-md-12 p-0 mb-2 pr-lg-2 pb-3">
          <div className="d-sm-none">
            <CreateGameButton handleClick={handleShowModal} />
          </div>
          <GameContainers
            activeGames={activeGames}
            completedGames={completedGames}
            liveTournaments={liveTournaments}
            completedTournaments={completedTournaments}
            totalGames={totalGames}
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
