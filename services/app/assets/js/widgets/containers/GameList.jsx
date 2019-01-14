import React, { Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import Gon from 'gon';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import { fetchState } from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
import Loading from '../components/Loading';
import GamesHeatmap from '../components/GamesHeatmap';
import UserName from '../components/UserName';

class GameList extends React.Component {
  levelToClass = {
    elementary: 'info',
    easy: 'success',
    medium: 'warning',
    hard: 'danger',
  };

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
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

    return null;
  };

  renderPlayers = (gameId, users) => {
    if (users.length === 1) {
      return (
        <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }} colSpan={2}>
          <UserName user={users[0]} />
        </td>
      );
    }
    return (
      <Fragment>
        <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
          {this.renderResultIcon(gameId, users[0], users[1])}
          <UserName user={users[0]} />
        </td>
        <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
          {this.renderResultIcon(gameId, users[1], users[0])}
          <UserName user={users[1]} />
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

  renderStartNewGameButton = level => (
    <button
      className="dropdown-item"
      type="button"
      data-method="post"
      data-csrf={window.csrf_token}
      data-to={`games?level=${level}`}
    >
      <span className={`badge badge-pill badge-${this.levelToClass[level]} mr-1`}>&nbsp;</span>
      {level}
    </button>
  );

  renderStartNewGameSelector = () => {
    const currentUser = Gon.getAsset('current_user');
    if (currentUser.id === 'anonymous') {
      return null;
    }
    return (
      <div className="btn-group" role="group">
        <button
          id="btnGroupStartNewGame"
          type="button"
          className="btn btn-success dropdown-toggle"
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false"
        >
            Start a new game
        </button>
        <div className="dropdown-menu" aria-labelledby="btnGroupStartNewGame">
          <div className="dropdown-header">Select a difficulty</div>
          <div className="dropdown-divider" />
          {this.renderStartNewGameButton('elementary')}
          {this.renderStartNewGameButton('easy')}
          {this.renderStartNewGameButton('medium')}
          {this.renderStartNewGameButton('hard')}
        </div>
      </div>
    );
  }

  renderActiveGames = () => {
    const { activeGames } = this.props;
    if (_.isEmpty(activeGames)) {
      return (
        <div className="text-center">
          <p className="p-2">Not have active games now</p>
          {this.renderStartNewGameSelector()}
        </div>
      );
    }

    return (
      <div>
        {this.renderStartNewGameSelector()}
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
              {activeGames.map((game) => {
                console.log(game);
                return (
                  <tr key={game.game_id}>
                    <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
                      {moment
                        .utc(game.game_info.inserted_at)
                        .local()
                        .format('YYYY-MM-DD HH:mm')}
                    </td>
                    <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
                      {this.renderGameLevelBadge(game.game_info.level)}
                    </td>

                    {this.renderPlayers(game.id, game.users)}

                    <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
                      {game.game_info.state}
                    </td>

                    <td className="p-3 align-middle">{this.renderGameActionButton(game)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  render() {
    const { activeGames, completedGames } = this.props;

    if (!activeGames) {
      return <Loading />;
    }

    return (
      <div>
        <h3 className="text-center mt-3 mb-4">Active games</h3>
        {this.renderActiveGames()}
        <div className="row px-4 mt-5 justify-content-center">
          <div className="col-12 col-sm-8 col-md-6">
            <GamesHeatmap />
          </div>
        </div>
        <h3 className="text-center mt-5 mb-4">Completed games</h3>
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
                  <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
                    {moment
                      .utc(game.updated_at)
                      .local()
                      .format('YYYY-MM-DD HH:mm')}
                  </td>
                  <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
                    {this.renderGameLevelBadge(game.level)}
                  </td>
                  {this.renderPlayers(game.id, game.players)}

                  <td className="p-3 align-middle" style={{ whiteSpace: 'nowrap' }}>
                    {moment.duration(game.duration, 'seconds').humanize()}
                  </td>

                  <td className="p-3 align-middle">{this.renderShowGameButton(`/games/${game.id}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

// TODO: Add selector
const mapStateToProps = state => ({
  activeGames: state.gameList.activeGames,
  completedGames: state.gameList.completedGames,
});

export default connect(
  mapStateToProps,
  null,
)(GameList);
