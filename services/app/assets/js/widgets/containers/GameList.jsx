import React, { Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';
import Gon from 'gon';
import qs from 'qs';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import * as lobbyMiddlewares from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
import * as actions from '../actions';
import { activeGamesSelector, completedGamesSelector, gameListLoadedSelector } from '../selectors';
import Loading from '../components/Loading';
import GamesHeatmap from '../components/GamesHeatmap';
import UserInfo from './UserInfo';

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

  renderResultIcon = (gameId, player1, player2) => {
    const tooltipId = `tooltip-${gameId}-${player1.id}`;

    if (player1.game_result === 'gave_up') {
      return (
        <OverlayTrigger
          overlay={<Tooltip id={tooltipId}>Player gave up</Tooltip>}
          placement="left"
        >
          <span className="align-middle mr-2">
            <i className="fa fa-flag-o" aria-hidden="true" />
          </span>
        </OverlayTrigger>
      );
    }

    if (player1.game_result === 'won' && player2.game_result !== 'gave_up') {
      return (
        <OverlayTrigger
          overlay={<Tooltip id={tooltipId}>Player won</Tooltip>}
          placement="left"
        >
          <span className="align-middle mr-2">
            <i className="fa fa-trophy text-warning" aria-hidden="true" />
          </span>
        </OverlayTrigger>
      );
    }

    return this.renderEmptyResultIcon();
  };

  renderEmptyResultIcon = () => (
    <span className="align-middle mr-1">
      <i className="fa fa-fw" aria-hidden="true" />
    </span>
  );

  renderPlayers = (gameId, users) => {
    if (users.length === 1) {
      return (
        <td className="p-3 align-middle text-nowrap" colSpan={2}>
          {this.renderEmptyResultIcon()}
          <UserInfo user={users[0]} />
        </td>
      );
    }
    return (
      <Fragment>
        <td className="p-3 align-middle text-nowrap x-username-td text-truncate">
          {this.renderResultIcon(gameId, users[0], users[1])}
          <UserInfo user={users[0]} />
        </td>
        <td className="p-3 align-middle text-nowrap x-username-td text-truncate">
          {this.renderResultIcon(gameId, users[1], users[0])}
          <UserInfo user={users[1]} />
        </td>
      </Fragment>
    );
  };

  renderGameLevelBadge = level => (
    <div>
      <span className={`badge badge-pill badge-${this.levelToClass[level]} mr-1`}>&nbsp;</span>
      {level}
    </div>
  );

  isPlayer = (user, game) => !_.isEmpty(_.find(game.users, { id: user.id }));

  renderShowGameButton = gameUrl => (
    <button type="button" className="btn btn-info btn-sm" data-method="get" data-to={gameUrl}>
      Show
    </button>
  );

  renderGameActionButton = (game) => {
    const gameUrl = `/games/${game.game_id}`;
    const currentUser = Gon.getAsset('current_user');
    const gameState = game.game_info.state;

    if (gameState === GameStatusCodes.playing) {
      return this.renderShowGameButton(gameUrl);
    }

    if (gameState === GameStatusCodes.waitingOpponent) {
      if (this.isPlayer(currentUser, game)) {
        return (
          <div className="btn-group">
            {this.renderShowGameButton(gameUrl)}
            <button
              type="button"
              className="btn btn-danger btn-sm"
              data-method="delete"
              data-csrf={window.csrf_token}
              data-to={gameUrl}
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
        <button
          type="button"
          className="btn btn-primary btn-sm"
          data-method="post"
          data-csrf={window.csrf_token}
          data-to={`${gameUrl}/join`}
        >
          Join
        </button>
      );
    }

    return null;
  };

  renderStartNewGameButton = (gameLevel, gameType) => {
    const queryParamsString = qs.stringify({ level: gameLevel, type: gameType });
    const gameUrl = `/games?${queryParamsString}`;

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

  renderStartNewGameDropdownMenu = gameType => (
    <Fragment>
      <div className="dropdown-header">Select a difficulty</div>
      <div className="dropdown-divider" />
      {this.renderStartNewGameButton('elementary', gameType)}
      {this.renderStartNewGameButton('easy', gameType)}
      {this.renderStartNewGameButton('medium', gameType)}
      {this.renderStartNewGameButton('hard', gameType)}
    </Fragment>
  )

  renderStartNewGameSelector = () => (
    <div className="dropdown mr-sm-3 mr-0 mb-sm-0 mb-3">
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
        {this.renderStartNewGameDropdownMenu('withRandomPlayer')}
      </div>
    </div>
  );

  renderPlayWithFriendSelector = () => (
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
        {this.renderStartNewGameDropdownMenu('withFriend')}
      </div>
    </div>
  );

  // TODO: add this render under "Play with the bot" when the server part is ready
  renderPlayWithBotSelector = () => (
    <div className="dropdown">
      <button
        id="btnGroupPlayWithBot"
        type="button"
        className="btn btn-sm btn-outline-success dropdown-toggle"
        data-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <i className="fa fa-android mr-2" />
          Play with the bot
      </button>
      <div className="dropdown-menu" aria-labelledby="btnGroupPlayWithBot">
        {this.renderStartNewGameDropdownMenu('withBot')}
      </div>
    </div>
  );

  renderActiveGames = (activeGames) => {
    if (_.isEmpty(activeGames)) {
      return (
        <p className="text-center">There are no active games right now.</p>
      );
    }

    return (
      <div className="table-responsive mt-2">
        <table className="table">
          <thead className="text-left">
            <tr>
              <th className="p-3 border-0">Date</th>
              <th className="p-3 border-0">Level</th>
              <th className="p-3 border-0" colSpan="2">Players</th>
              <th className="p-3 border-0">State</th>
              <th className="p-3 border-0">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeGames.map(game => (
              <tr key={game.game_id}>
                <td className="p-3 align-middle text-nowrap">
                  {moment
                    .utc(game.game_info.starts_at)
                    .local()
                    .format('YYYY-MM-DD HH:mm')}
                </td>
                <td className="p-3 align-middle text-nowrap">
                  {this.renderGameLevelBadge(game.game_info.level)}
                </td>

                {this.renderPlayers(game.id, game.users)}

                <td className="p-3 align-middle text-nowrap">
                  {game.game_info.state}
                </td>

                <td className="p-3 align-middle">{this.renderGameActionButton(game)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  renderGameContainers = (activeGames, completedGames) => (
    <>
      <div className="container bg-white shadow-sm py-4 mb-3">
        <h3 className="text-center mb-4">Active games</h3>
        {this.renderActiveGames(activeGames)}
      </div>
      <div className="container bg-white shadow-sm py-4">
        <h3 className="text-center mb-4">Completed games</h3>
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="p-3 border-0">Date</th>
                <th className="p-3 border-0">Level</th>
                <th className="p-3 border-0" colSpan="2">Players</th>
                <th className="p-3 border-0">Duration</th>
                <th className="p-3 border-0">Actions</th>
              </tr>
            </thead>
            <tbody>
              {completedGames.map(game => (
                <tr key={game.id}>
                  <td className="p-3 align-middle text-nowrap">
                    {moment
                        .utc(game.updated_at)
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
                  <td className="p-3 align-middle">{this.renderShowGameButton(`/games/${game.id}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  render() {
    const { activeGames, completedGames, loaded } = this.props;
    return (
      <>
        <div className="container bg-white shadow-sm py-4 mb-3">
          <h3 className="text-center mb-4">New game</h3>
          <div className="d-flex flex-sm-row flex-column align-items-center justify-content-center flex-wrap">
            {this.renderStartNewGameSelector()}
            {this.renderPlayWithFriendSelector()}
          </div>
        </div>

        {!loaded ? (
          <Loading />
        )
          : this.renderGameContainers(activeGames, completedGames)
        }
      </>
    );
  }
}

const mapStateToProps = state => ({
  activeGames: activeGamesSelector(state),
  loaded: gameListLoadedSelector(state),
  completedGames: completedGamesSelector(state),
  currentUser: Gon.getAsset('current_user'), // FIXME: don't use gon in components, Luke
});

const mapDispatchToProps = {
  setCurrentUser: actions.setCurrentUser,
  fetchState: lobbyMiddlewares.fetchState,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GameList);
