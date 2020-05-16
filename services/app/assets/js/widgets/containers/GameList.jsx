import React, { useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';
import Gon from 'gon';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import * as lobbyMiddlewares from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
import * as actions from '../actions';
import * as selectors from '../selectors';
import Loading from '../components/Loading';
import GamesHeatmap from '../components/GamesHeatmap';
import Card from '../components/Card';
import UserInfo from './UserInfo';
import { makeCreateGameBotUrl, getSignInGithubUrl } from '../utils/urlBuilders';
import PlayWithBotDropdown from '../components/PlayWithBotDropdown';
import CreateGameDropdown from '../components/CreateGameDropdown';
import PlayWithFriendDropdown from '../components/PlayWithFriendDropdown';
import i18n from '../../i18n';

const levelToClass = {
  elementary: 'info',
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

const isPlayer = (user, game) => !_.isEmpty(_.find(game.players, { id: user.id }));

const RenderEmptyResultIcon = () => (
  <span className="align-middle mr-1">
    <i className="fa x-opacity-0">&nbsp;</i>
  </span>
);

const RenderResultIcon = ({ gameId, player1, player2 }) => {
  const tooltipId = `tooltip-${gameId}-${player1.id}`;

  if (player1.gameResult === 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>}
        placement="left"
      >
        <span className="align-middle mr-1">
          <i className="far fa-flag" aria-hidden="true" />
        </span>
      </OverlayTrigger>
    );
  }

  if (player1.gameResult === 'won' && player2.gameResult !== 'gave_up') {
    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>Player won</Tooltip>}
        placement="left"
      >
        <span className="align-middle mr-1">
          <i className="fa fa-trophy text-warning" aria-hidden="true" />
        </span>
      </OverlayTrigger>
    );
  }
  return <RenderEmptyResultIcon />;
};

const RenderPlayers = ({ gameId, players }) => {
  if (players.length === 1) {
    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <RenderEmptyResultIcon />
          <UserInfo user={players[0]} />
        </div>
      </td>
    );
  }
  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex align-items-center">
          <RenderResultIcon
            gameId={gameId}
            player1={players[0]}
            player2={players[1]}
          />
          <UserInfo user={players[0]} />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex align-items-center">
          <RenderResultIcon
            gameId={gameId}
            player1={players[1]}
            player2={players[0]}
          />
          <UserInfo user={players[1]} />
        </div>
      </td>
    </>
  );
};

const RenderGameLevelBadge = ({ level }) => (
  <div>
    <span className={`badge badge-pill badge-${levelToClass[level]} mr-1`}>
      &nbsp;
    </span>
    {level}
  </div>
);

const RenderShowButton = ({ url }) => (
  <button
    type="button"
    className="btn btn-info btn-sm"
    data-method="get"
    data-to={url}
  >
    Show
  </button>
);

const RenderGameActionButton = ({ game }) => {
  const gameUrl = makeCreateGameBotUrl(game.id);
  const gameUrlJoin = makeCreateGameBotUrl(game.id, 'join');
  const gameState = game.state;
  const signInUrl = getSignInGithubUrl();
  const currentUser = Gon.getAsset('current_user');
  const dispatch = useDispatch();

  if (gameState === GameStatusCodes.playing) {
    return <RenderShowButton url={gameUrl} />;
  }

  if (gameState === GameStatusCodes.waitingOpponent) {
    if (isPlayer(currentUser, game)) {
      return (
        <div className="btn-group">
          <RenderShowButton url={gameUrl} />
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => dispatch(lobbyMiddlewares.cancelGame(game.id))}
          >
            Cancel
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
          className="btn btn-success btn-sm"
          data-method="post"
          data-csrf={window.csrf_token}
          data-to={gameUrlJoin}
        >
          Join
        </button>
        <RenderShowButton url={gameUrl} />
      </div>
    );
  }
  return null;
};

const RenderLiveTournaments = ({ tournaments }) => {
  if (_.isEmpty(tournaments)) {
    return (
      <div className="text-center">
        <p className="mb-0">There are no active tournaments right now</p>
        <a href="/tournaments/#create">You may want to create one</a>
      </div>
    );
  }
  return (
    <div className="table-responsive">
      <table className="table">
        <thead className="text-left">
          <tr>
            <th className="p-3 border-0">title</th>
            <th className="p-3 border-0">starts_at</th>
            <th className="p-3 border-0">type</th>
            <th className="p-3 border-0">state</th>
            <th className="p-3 border-0">actions</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map(tournament => (
            <tr key={tournament.id}>
              <td className="p-3 align-middle">{tournament.name}</td>
              <td className="p-3 align-middle text-nowrap">
                {moment
                  .utc(tournament.startsAt)
                  .local()
                  .format('YYYY-MM-DD HH:mm')}
              </td>
              <td className="p-3 align-middle text-nowrap">
                {tournament.type}
              </td>
              <td className="p-3 align-middle text-nowrap">
                {tournament.state}
              </td>
              <td className="p-3 align-middle">
                <RenderShowButton url={`/tournaments/${tournament.id}/`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RenderActiveGames = ({ games }) => {
  if (_.isEmpty(games)) {
    return <p className="text-center">There are no active games right now.</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table">
        <thead className="text-left">
          <tr>
            <th className="p-3 border-0">Date</th>
            <th className="p-3 border-0">Level</th>
            <th className="p-3 border-0 text-center" colSpan={2}>
              Players
            </th>
            <th className="p-3 border-0">State</th>
            <th className="p-3 border-0">Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => (
            <tr key={game.id}>
              <td className="p-3 align-middle text-nowrap">
                {moment.utc(game.insertedAt).local().format('YYYY-MM-DD HH:mm')}
              </td>
              <td className="p-3 align-middle text-nowrap">
                <RenderGameLevelBadge level={game.level} />
              </td>
              <RenderPlayers gameId={game.id} players={game.players} />
              <td className="p-3 align-middle text-nowrap">{game.state}</td>
              <td className="p-3 align-middle">
                <RenderGameActionButton game={game} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RenderCompletedGames = ({ games }) => (
  <div className="table-responsive">
    <table className="table table-sm">
      <thead>
        <tr>
          <th className="p-3 border-0">Date</th>
          <th className="p-3 border-0">Level</th>
          <th className="p-3 border-0 text-center" colSpan={2}>
            Players
          </th>
          <th className="p-3 border-0">Duration</th>
          <th className="p-3 border-0">Actions</th>
        </tr>
      </thead>
      <tbody>
        {games.map(game => (
          <tr key={game.id}>
            <td className="p-3 align-middle text-nowrap">
              {moment.utc(game.finishsAt).local().format('YYYY-MM-DD HH:mm')}
            </td>
            <td className="p-3 align-middle text-nowrap">
              <RenderGameLevelBadge level={game.level} />
            </td>
            <RenderPlayers gameId={game.id} players={game.players} />
            <td className="p-3 align-middle text-nowrap">
              {moment.duration(game.duration, 'seconds').humanize()}
            </td>
            <td className="p-3 align-middle">
              <RenderShowButton url={`/games/${game.id}`} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RenderGameContainers = ({
  activeGames,
  completedGames,
  liveTournaments,
}) => (
  <>
    <Card title="Active games">
      <RenderActiveGames games={activeGames} />
    </Card>
    <Card title="Active tournaments">
      <RenderLiveTournaments tournaments={liveTournaments} />
    </Card>
    <Card title="Game activity">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <GamesHeatmap />
        </div>
      </div>
    </Card>
    {!_.isEmpty(completedGames) && (
      <Card title="Completed games">
        <RenderCompletedGames games={completedGames} />
      </Card>
    )}
  </>
);

const GameList = () => {
  const currentUser = Gon.getAsset('current_user'); // FIXME: don't use gon in components, Luke
  const gameList = useSelector(state => selectors.gameListSelector(state));
  const {
    activeGames, completedGames, liveTournaments, loaded,
  } = gameList;
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(lobbyMiddlewares.fetchState());
  }, [currentUser, dispatch]);

  const renderStartNewGameButton = (gameLevel, gameUrl) => (
    <button
      key={gameUrl}
      className="dropdown-item"
      type="button"
      data-method="post"
      data-csrf={window.csrf_token}
      data-to={gameUrl}
    >
      <span
        className={`badge badge-pill badge-${levelToClass[gameLevel]} mr-1`}
      >
        &nbsp;
      </span>
      {gameLevel}
    </button>
  );

  if (!loaded) {
    return <Loading />;
  }
  return (
    <>
      <Card title="New game">
        <div className="d-flex flex-sm-row flex-column align-items-center justify-content-center flex-wrap">
          <PlayWithBotDropdown
            renderStartNewGameButton={renderStartNewGameButton}
          />
          <CreateGameDropdown
            renderStartNewGameButton={renderStartNewGameButton}
          />
          <PlayWithFriendDropdown
            renderStartNewGameButton={renderStartNewGameButton}
          />
        </div>
      </Card>
      {!loaded ? (
        <Loading />
      ) : (
        <RenderGameContainers
          activeGames={activeGames}
          completedGames={completedGames}
          liveTournaments={liveTournaments}
        />
      )}
    </>
  );
};

export default GameList;
