import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';
import Gon from 'gon';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import * as lobbyMiddlewares from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
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

class LobbyWidget extends React.Component {
  componentDidMount() {
    const { setCurrentUser, fetchState, currentUser } = this.props;
    setCurrentUser({ user: { ...currentUser } });
    fetchState();
  }

  renderResultIcon = (gameId, player1, player2) => {
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

    return this.renderEmptyResultIcon();
  };

  renderEmptyResultIcon = () => (
    <span className="align-middle mr-1">
      <i className="fa x-opacity-0">&nbsp;</i>
    </span>
  );

  renderPlayers = (gameId, players) => {
    if (players.length === 1) {
      return (
        <td className="p-3 align-middle text-nowrap" colSpan={2}>
          <div className="d-flex align-items-center">
            {this.renderEmptyResultIcon()}
            <UserInfo user={players[0]} />
          </div>
        </td>
      );
    }
    return (
      <>
        <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
          <div className="d-flex align-items-center">
            {this.renderResultIcon(gameId, players[0], players[1])}
            <UserInfo user={players[0]} />
          </div>
        </td>
        <td className="p-3 align-middle text-nowrap cb-username-td text-truncate">
          <div className="d-flex align-items-center">
            {this.renderResultIcon(gameId, players[1], players[0])}
            <UserInfo user={players[1]} />
          </div>
        </td>
      </>
    );
  };

  renderGameLevelBadge = level => (
    <div>
      <span className={`badge badge-pill badge-${levelToClass[level]} mr-1`}>
        &nbsp;
      </span>
      {level}
    </div>
  );

  isPlayer = (user, game) => !_.isEmpty(_.find(game.players, { id: user.id }));

  renderShowButton = url => (
    <button
      type="button"
      className="btn btn-info btn-sm"
      data-method="get"
      data-to={url}
    >
      Show
    </button>
  );

  renderGameActionButton = game => {
    const gameUrl = makeCreateGameBotUrl(game.id);
    const gameUrlJoin = makeCreateGameBotUrl(game.id, 'join');
    const currentUser = Gon.getAsset('current_user');
    const gameState = game.state;
    const signInUrl = getSignInGithubUrl();

    if (gameState === GameStatusCodes.playing) {
      return this.renderShowButton(gameUrl);
    }

    if (gameState === GameStatusCodes.waitingOpponent) {
      if (this.isPlayer(currentUser, game)) {
        return (
          <div className="btn-group">
            {this.renderShowButton(gameUrl)}
            <button
              type="button"
              className="btn btn-danger btn-sm"
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
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-danger btn-sm"
            data-method="post"
            data-csrf={window.csrf_token}
            data-to={gameUrlJoin}
          >
            {i18n.t('Fight')}
          </button>
          {this.renderShowButton(gameUrl)}
        </div>
      );
    }

    return null;
  };

  renderIntro = () => (
    <div className="container-xl bg-white shadow-sm rounded py-4 mb-3">
      <h1 className="font-weight-light mb-4 text-center">
        {i18n.t('Codebattle Intro Title')}
      </h1>
      <div className="row align-items-center">
        <div className="col-12 col-md-7 col-lg-7">
          <p className="h4 font-weight-normal x-line-height-15 my-4">
            {i18n.t('Codebattle Intro')}
          </p>
          {this.renderIntroButtons()}
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

  renderIntroButtons = () => {
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

  renderLiveTournaments = tournaments => {
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
            </tr>
          </thead>
          <tbody>
            {tournaments.map(tournament => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle">{tournament.name}</td>
                <td className="p-3 align-middle">
                  {this.renderShowButton(`/tournaments/${tournament.id}/`)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  renderActiveGames = games => {
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
            {games.map(game => (
              <tr key={game.id}>
                <td className="p-3 align-middle text-nowrap">
                  {this.renderGameLevelBadge(game.level)}
                </td>
                <td className="p-3 align-middle">
                  {this.renderGameActionButton(game)}
                </td>
                {this.renderPlayers(game.id, game.players)}
                <td className="p-3 align-middle text-nowrap">{game.state}</td>
                <td className="p-3 align-middle text-nowrap">
                  {moment
                    .utc(game.insertedAt)
                    .local()
                    .format('YYYY-MM-DD HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  renderCompletedGames = games => (
    <div className="table-responsive">
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="p-3 border-0">Level</th>
            <th className="p-3 border-0">Actions</th>
            <th className="p-3 border-0 text-center" colSpan={2}>
              Players
            </th>
            <th className="p-3 border-0">Duration</th>
            <th className="p-3 border-0">Date</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => (
            <tr key={game.id}>
              <td className="p-3 align-middle text-nowrap">
                {this.renderGameLevelBadge(game.level)}
              </td>
              <td className="p-3 align-middle">
                {this.renderShowButton(`/games/${game.id}`)}
              </td>
              {this.renderPlayers(game.id, game.players)}
              <td className="p-3 align-middle text-nowrap">
                {moment.duration(game.duration, 'seconds').humanize()}
              </td>
              <td className="p-3 align-middle text-nowrap">
                {moment.utc(game.finishsAt).local().format('YYYY-MM-DD HH:mm')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  renderGameContainers = () => {
    const { activeGames, completedGames, liveTournaments } = this.props;
    return (
      <>
        <Card title="Active games">{this.renderActiveGames(activeGames)}</Card>
        <Card title="Active tournaments">
          {this.renderLiveTournaments(liveTournaments)}
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
            {this.renderCompletedGames(completedGames)}
          </Card>
        )}
      </>
    );
  };

  render() {
    const { loaded, currentUser } = this.props;
    const isGuestCurrentUser = !currentUser || currentUser.guest;

    if (!loaded) {
      return <Loading />;
    }

    return (
      <>
        {isGuestCurrentUser ? this.renderIntro() : <StartGamePanel />}
        {!loaded ? <Loading /> : this.renderGameContainers()}
      </>
    );
  }
}

const mapStateToProps = state => ({
  ...selectors.gameListSelector(state),
  currentUser: Gon.getAsset('current_user'), // FIXME: don't use gon in components, Luke
});

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  fetchState: lobbyMiddlewares.fetchState,
  cancelGame: lobbyMiddlewares.cancelGame,
  selectNewGameTimeout: actions.selectNewGameTimeout,
};

export default connect(mapStateToProps, mapDispatchToProps)(LobbyWidget);
