import React, { useEffect } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import Gon from 'gon';
import cn from 'classnames';
import * as lobbyMiddlewares from '../middlewares/Lobby';
import gameStatusCodes from '../config/gameStatusCodes';
import levelToClass from '../config/levelToClass';
import { actions } from '../slices';
import * as selectors from '../selectors';
import Loading from '../components/Loading';
import GamesHeatmap from '../components/GamesHeatmap';
import Card from '../components/Card';
import UserInfo from './UserInfo';
import {
  makeCreateGameBotUrl,
  getSignInGithubUrl,
  makeCreateGameUrlDefault,
} from '../utils/urlBuilders';
import i18n from '../../i18n';
import StartGamePanel from '../components/StartGamePanel';
import ResultIcon from '../components/Game/ResultIcon';
import CompletedGames from '../components/Game/CompletedGames';

const Players = ({ gameId, players }) => {
  if (players.length === 1) {
    return (
      <td className="p-3 align-middle text-nowrap" colSpan={2}>
        <div className="d-flex align-items-center">
          <span className="align-middle mr-1">
            <i className="fa x-opacity-0">&nbsp;</i>
          </span>
          <UserInfo user={players[0]} />
        </div>
      </td>
    );
  }
  return (
    <>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex align-items-center">
          <ResultIcon gameId={gameId} player1={players[0]} player2={players[1]} />
          <UserInfo user={players[0]} />
        </div>
      </td>
      <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
        <div className="d-flex align-items-center">
          <ResultIcon gameId={gameId} player1={players[1]} player2={players[0]} />
          <UserInfo user={players[1]} />
        </div>
      </td>
    </>
  );
};

const GameLevelBadge = ({ level }) => (
  <div>
    <span className={`badge badge-pill badge-${levelToClass[level]} mr-1`}>
      &nbsp;
    </span>
    {level}
  </div>
);

const isPlayer = (user, game) => !_.isEmpty(_.find(game.players, { id: user.id }));

const ShowButton = ({ url }) => (
  <a
    type="button"
    className="btn btn-info btn-sm w-100"
    href={url}
  >
    Show
  </a>
);

const ContinueButton = ({ url }) => (
  <a
    type="button"
    className="btn btn-success btn-sm w-100"
    href={url}
  >
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
        <div className="btn-group w-100">
          <ContinueButton url={gameUrl} />
          <button
            type="button"
            className="btn btn-danger btn-sm w-100"
            onClick={lobbyMiddlewares.cancelGame(game.id)}
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
      <div className="btn-group w-100">
        <button
          type="button"
          className="btn btn-danger btn-sm w-100"
          data-method="post"
          data-csrf={window.csrf_token}
          data-to={gameUrlJoin}
        >
          {i18n.t('Fight')}
        </button>
        <ShowButton url={gameUrl} />
      </div>
    );
  }

  return null;
};

const IntroButtons = () => {
  const level = 'elementary';
  const gameUrl = makeCreateGameUrlDefault(level, 'training', 3600);

  return (
    <>
      <button
        key={gameUrl}
        type="button"
        data-method="post"
        data-csrf={window.csrf_token}
        data-to={gameUrl}
        className="btn btn-primary mr-2"
      >
        <i className="fa fa-robot mr-2" />
        {i18n.t('Start simple battle')}
      </button>
    </>
  );
};
const Intro = () => (
  <div className="container-xl bg-white shadow-sm rounded py-4 mb-3">
    <h1 className="font-weight-light mb-4 text-center">
      {i18n.t('Codebattle Intro Title')}
    </h1>
    <div className="row align-items-center">
      <div className="col-12 col-md-7 col-lg-7">
        <p className="h4 font-weight-normal x-line-height-15 my-4">
          {i18n.t('Codebattle Intro')}
        </p>
        <IntroButtons />
      </div>
      <div className="d-none d-md-block col-md-5 col-lg-4">
        <video
          autoPlay
          className="w-100 shadow-lg"
          poster="/assets/images/opengraph-main.png"
          loop
          muted
          playsInline
          src="https://files.fm/down.php?i=x3hybevp"
          width="100%"
        />
      </div>
    </div>
  </div>
);
const LiveTournaments = ({ tournaments }) => {
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
            <th className="p-3 border-0">actions</th>
            <th className="p-3 border-0">starts_at</th>
            <th className="p-3 border-0">type</th>
            <th className="p-3 border-0">state</th>
            <th className="p-3 border-0">creator</th>
          </tr>
        </thead>
        <tbody>
          {_.orderBy(tournaments, 'startsAt', 'desc').map(tournament => (
            <tr key={tournament.id}>
              <td className="p-3 align-middle">{tournament.name}</td>
              <td className="p-3 align-middle">
                <ShowButton url={`/tournaments/${tournament.id}/`} />
              </td>
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
              <td className="p-3 align-middle text-nowrap">
                <UserInfo user={tournament.creator} />
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
  if (_.isEmpty(games)) {
    return (
      <p className="text-center">There are no active games right now.</p>
    );
  }
  return (
    <div className="table-responsive">
      <table className="table">
        <thead className="text-left">
          <tr>
            <th className="p-3 border-0">Level</th>
            <th className="p-3 border-0">Actions</th>
            <th className="p-3 border-0 text-center" colSpan={2}>
              Players
            </th>
            <th className="p-3 border-0">State</th>
            <th className="p-3 border-0">Date</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => {
           const activeGameClasses = cn('text-dark', {
             'alert-info': isPlayer(currentUser, game),
           });
           return (
             <tr key={game.id} className={activeGameClasses}>
               <td className="p-3 align-middle text-nowrap">
                 <GameLevelBadge level={game.level} />
               </td>
               <td className="p-3 align-middle">
                 <GameActionButton game={game} />
               </td>
               <Players gameId={game.id} players={game.players} />
               <td className="p-3 align-middle text-nowrap">{game.state}</td>
               <td className="p-3 align-middle text-nowrap">
                 {moment
                  .utc(game.insertedAt)
                  .local()
                  .format('YYYY-MM-DD HH:mm')}
               </td>
             </tr>
           );
})}
        </tbody>
      </table>
    </div>
  );
};

const GameContainers = ({ activeGames, completedGames, liveTournaments }) => (
  <>
    <Card title="Active games">
      <ActiveGames games={activeGames} />
    </Card>
    <Card title="Active tournaments">
      <LiveTournaments tournaments={liveTournaments} />
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
      <CompletedGames games={completedGames} />
    </Card>
      )}
  </>
  );

const LobbyWidget = () => {
  const currentUser = Gon.getAsset('current_user');
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(actions.setCurrentUser({ user: { ...currentUser } }));
    dispatch(lobbyMiddlewares.fetchState());
  }, [currentUser, dispatch]);

  const {
    loaded, activeGames, completedGames, liveTournaments,
  } = useSelector(state => selectors.gameListSelector(state));

  const isGuestCurrentUser = !currentUser || currentUser.guest;

    if (!loaded) {
      return <Loading />;
    }

    return (
      <>
        {isGuestCurrentUser ? <Intro /> : <StartGamePanel />}
        <GameContainers
          activeGames={activeGames}
          completedGames={completedGames}
          liveTournaments={liveTournaments}
        />
      </>
    );
};

export default LobbyWidget;
