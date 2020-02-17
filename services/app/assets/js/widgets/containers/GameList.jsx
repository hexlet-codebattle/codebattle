import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';
import Gon from 'gon';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import i18n from '../../i18n';

import * as lobbyMiddlewares from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
import * as actions from '../actions';
import * as selectors from '../selectors';
import Loading from '../components/Loading';
import GamesHeatmap from '../components/GamesHeatmap';
import Card from '../components/Card';
import UserInfo from './UserInfo';
import makeCreateGameUrl from '../utils/makeCreateGameUrl';

const timeoutOptions = {
  0: i18n.t('Timeout - no timeout'),
  60: i18n.t('Timeout 60 seconds'),
  120: i18n.t('Timeout 120 seconds'),
  300: i18n.t('Timeout 300 seconds'),
  600: i18n.t('Timeout 600 seconds'),
  1200: i18n.t('Timeout 1200 seconds'),
  3600: i18n.t('Timeout 3600 seconds'),
};

const orderedLevels = ['elementary', 'easy', 'medium', 'hard'];

class GameList extends React.Component {
  levelToClass = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  componentDidMount() {
    const { setCurrentUser, fetchState, currentUser } = this.props;
    setCurrentUser({ user: { ...currentUser } });
    fetchState();
  }

  updateTimeoutSeconds = timeoutSeconds => {
    const { selectNewGameTimeout } = this.props;
    selectNewGameTimeout({ timeoutSeconds });
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
      <i className="fa  fa-hidden">&nbsp;</i>
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
        <td className="p-3 align-middle text-nowrap x-username-td text-truncate">
          <div className="d-flex align-items-center">
            {this.renderResultIcon(gameId, players[0], players[1])}
            <UserInfo user={players[0]} />
          </div>
        </td>
        <td className="p-3 align-middle text-nowrap x-username-td text-truncate">
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
      <span className={`badge badge-pill badge-${this.levelToClass[level]} mr-1`}>&nbsp;</span>
      {level}
    </div>
  );

  isPlayer = (user, game) => !_.isEmpty(_.find(game.players, { id: user.id }));

  renderShowButton = url => (
    <button type="button" className="btn btn-info btn-sm" data-method="get" data-to={url}>
      Show
    </button>
  );

  renderGameActionButton = game => {
    const gameUrl = `/games/${game.gameId}`;
    const currentUser = Gon.getAsset('current_user');
    const gameState = game.gameInfo.state;

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
              onClick={lobbyMiddlewares.cancelGame(game.gameId)}
            >
              Cancel
            </button>
          </div>
        );
      }
      if (currentUser.id === 'anonymous') {
        return null;
      }
      return (
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-success btn-sm"
            data-method="post"
            data-csrf={window.csrf_token}
            data-to={`${gameUrl}/join`}
          >
            Join
          </button>
          {this.renderShowButton(gameUrl)}
        </div>
      );
    }

    return null;
  };

  renderStartNewGameButton = (gameLevel, gameType, timeoutSeconds, gameId) => {
    const gameUrl = makeCreateGameUrl({gameLevel, gameType, timeoutSeconds, gameId});

    return (
      <button
        className="dropdown-item"
        type="button"
        data-method="post"
        data-csrf={window.csrf_token}
        data-to={gameUrl}
      >
        <span className={`badge badge-pill badge-${this.levelToClass[gameLevel]} mr-1`}>&nbsp;</span>
        {gameLevel}
      </button>
    );
  };

  renderStartNewGameDropdownMenu = (gameType, timeoutSeconds = 0) => {
    const renderButton = (level) => {
      const rendererMap = {
        withBot: () => {
          const { activeGames } = this.props;
          const gamesWithBot = activeGames.filter(game => game.gameInfo.isBot);
          const selectGameByLevel = (type) => gamesWithBot.find(game => game.gameInfo.level === type);
          const game = selectGameByLevel(level);
          return this.renderStartNewGameButton(level, gameType, 0, game.gameId);
        }
      }
      const render = rendererMap[gameType] && rendererMap[gameType]();
      return render || this.renderStartNewGameButton(level, gameType, timeoutSeconds);
    };
    return (
      <>
        <div className="dropdown-header">Select a difficulty</div>
        <div className="dropdown-divider" />
        {orderedLevels.map(level => <div key={level}>
          {renderButton(level, gameType, timeoutSeconds)}
        </div>)}
      </>
    );
  }

  renderStartNewGameSelector = timeoutSeconds => (
    <div className="dropdown mr-sm-3 mr-0 mb-sm-0 mx-3">
      <button
        id="btnGroupStartNewGame"
        type="button"
        className="btn btn-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-random mr-2" />
        Create a game
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupStartNewGame">
        {this.renderStartNewGameDropdownMenu('withRandomPlayer', timeoutSeconds)}
      </div>
    </div>
  );

  renderPlayWithFriendSelector = timeoutSeconds => (
    <div className="dropdown">
      <button
        id="btnGroupPlayWithFriend"
        type="button"
        className="btn btn-outline-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-male mr-2" />
        Play with a friend
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupPlayWithFriend">
        {this.renderStartNewGameDropdownMenu('withFriend', timeoutSeconds)}
      </div>
    </div>
  );

  renderTimeoutSelector = timeoutSeconds => (
    <div className="dropdown mr-sm-3 mr-0 mb-sm-0 mb-3">
      <button
        id="btnGroupTimeoutSelector"
        type="button"
        className="btn btn-outline-info dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fas fa-stopwatch mr-2" />
        {timeoutOptions[timeoutSeconds]}
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupStartNewGame">
        {this.renderTimeoutSelectorDropdownMenu('withRandomPlayer', timeoutSeconds)}
      </div>
    </div>
  );

  renderTimeoutSelectorDropdownMenu = () => {
    const options = _.map(timeoutOptions, (text, timeoutSeconds) => (
      <button
        className="dropdown-item"
        type="button"
        key={text}
        onClick={() => this.updateTimeoutSeconds(timeoutSeconds)}
      >
        {text}
      </button>
    ));
    // const options = []
    //
    return (
      <>
        <div className="dropdown-header">Select time limit</div>
        <div className="dropdown-divider" />
        {options}
      </>
    );
  };

  // TODO: add this render under "Play with the bot" when the server part is ready
  renderPlayWithBotSelector = () => (
    <div className="dropdown">
      <button
        id="btnGroupPlayWithBot"
        type="button"
        className="btn btn-outline-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-robot mr-2" />
        Play with the bot
    </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupPlayWithBot">
        {this.renderStartNewGameDropdownMenu('withBot')}
      </div>
    </div>
  );

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
              <th className="p-3 border-0">starts_at</th>
              <th className="p-3 border-0">type</th>
              {/* <th className="p-3 border-0">creator</th> */}
              <th className="p-3 border-0">state</th>
              <th className="p-3 border-0">actions</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map(tournament => (
              <tr key={tournament.id}>
                <td className="p-3 align-middle text-nowrap">
                  {tournament.name}
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
                <td className="p-3 align-middle">
                  {this.renderShowButton(`/tournaments/${tournament.id}/`)}
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
              <th className="p-3 border-0">Date</th>
              <th className="p-3 border-0">Level</th>
              <th className="p-3 border-0 text-center" colSpan="2">Players</th>
              <th className="p-3 border-0">State</th>
              <th className="p-3 border-0 text-nowrap">Time limit</th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody>
            {games.map(game => (
              <tr key={game.gameId}>
                <td className="p-3 align-middle text-nowrap">
                  {moment
                    .utc(game.gameInfo.startsAt)
                    .local()
                    .format('YYYY-MM-DD HH:mm')}
                </td>
                <td className="p-3 align-middle text-nowrap">
                  {this.renderGameLevelBadge(game.gameInfo.level)}
                </td>
                {this.renderPlayers(game.id, game.players)}
                <td className="p-3 align-middle text-nowrap">
                  {game.gameInfo.state}
                </td>
                <td className="p-3 align-middle text-nowrap">
                  {timeoutOptions[game.gameInfo.timeoutSeconds]}
                </td>
                <td className="p-3 align-middle">{this.renderGameActionButton(game)}</td>
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
            <th className="p-3 border-0">Date</th>
            <th className="p-3 border-0">Level</th>
            <th className="p-3 border-0 text-center" colSpan="2">Players</th>
            <th className="p-3 border-0">Duration</th>
            <th className="p-3 border-0">Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => (
            <tr key={game.id}>
              <td className="p-3 align-middle text-nowrap">
                {moment
                  .utc(game.updatedAt)
                  .local()
                  .format('YYYY-MM-DD HH:mm')}
              </td>
              <td className="p-3 align-middle text-nowrap">
                {this.renderGameLevelBadge(game.level)}
              </td>
              {this.renderPlayers(game.id, game.players)}
              <td className="p-3 align-middle text-nowrap">
                {moment.duration(game.duration, 'seconds').humanize()}
              </td>
              <td className="p-3 align-middle">{this.renderShowButton(`/games/${game.id}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  renderGameContainers = () => {
    const {
      activeGames, completedGames, liveTournaments,
    } = this.props;
    return (
      <>
        <Card title="Active games">
          {this.renderActiveGames(activeGames)}
        </Card>
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
  }

  render() {
    const { loaded, newGame } = this.props;
    const timeoutSeconds = newGame.timeoutSeconds || 0;
    if (!loaded) {
      return <Loading />
    }
    return (
      <>
        <Card title="New game">
          <div className="d-flex flex-sm-row flex-column align-items-center justify-content-center flex-wrap">
            {this.renderPlayWithBotSelector()}
            {this.renderStartNewGameSelector(timeoutSeconds)}
            {this.renderPlayWithFriendSelector(timeoutSeconds)}
          </div>
        </Card>
        {this.renderGameContainers()}
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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameList);
