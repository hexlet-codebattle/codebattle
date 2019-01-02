import React, { Fragment } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import Gon from 'gon';
import { fetchState } from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
import Loading from '../components/Loading';
import GamesHeatmap from '../components/GamesHeatmap';

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


  renderPlayers = users => (
    <Fragment>
      {users.map(({
        id, name, rating, github_id: githubId,
      }) => (
        <td
          key={id}
          className="align-middle"
          style={{ whiteSpace: 'nowrap' }}
        >
          <a
            className="nav-link"
            href={`/users/${id}`}
            key={githubId}
            style={{ display: 'inline-block' }}
          >
            <img
              className="attachment rounded mr-2"
              alt={name}
              src={`https://avatars0.githubusercontent.com/u/${githubId}`}
              style={{ width: '25px' }}
            />
            {`${name}(${rating})`}
          </a>
        </td>
      ))}
    </Fragment>
  )

  renderGameLevelBadge = level => (
    <div>
      <span className={`badge badge-pill badge-${this.levelToClass[level]} mr-1`}>&nbsp;</span>
      {level}
    </div>
  )

  isPlayer = (user, game) => !_.isEmpty(_.find(game.users, { id: user.id }))

  renderShowGameButton = gameUrl => (
    <button
      type="button"
      className="btn btn-info btn-sm"
      data-method="get"
      data-to={gameUrl}
    >
      Show
    </button>
  )

  renderGameActionButton = (game) => {
    const gameUrl = `/games/${game.game_id}`;
    const user = Gon.getAsset('current_user');
    const gameState = game.game_info.state;

    if (gameState === GameStatusCodes.playing) {
      return this.renderShowGameButton(gameUrl);
    }

    if (gameState === GameStatusCodes.waitingOpponent) {
      if (this.isPlayer(user, game)) {
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
  }

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
  )

  render() {
    const { activeGames, completedGames } = this.props;

    if (!activeGames) {
      return (<Loading />);
    }

    return (
      <div>
        <h3 className="text-center mt-3 mb-4">
          Active games
        </h3>
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Level</th>
              <th colSpan="2">Players</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {
              activeGames.map(game => (
                <tr key={game.game_id}>
                  <td
                    className="align-middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {moment.utc(game.game_info.inserted_at).local().format('YYYY-MM-DD HH:mm')}
                  </td>
                  <td
                    className="align-middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {this.renderGameLevelBadge(game.game_info.level)}
                  </td>

                  {this.renderPlayers(game.users)}

                  <td
                    className="align-middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {game.game_info.state}
                  </td>

                  <td
                    className="align-middle"
                  >
                    {this.renderGameActionButton(game)}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>

        <div className="btn-group" role="group">
          <button id="btnGroupStartNewGame" type="button" className="btn btn-success dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
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
        <div className="row px-4 mt-5 justify-content-center">
          <div className="col-6">
            <GamesHeatmap />
          </div>
        </div>
        <h3 className="text-center mt-3 mb-4">
          Completed games
        </h3>
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Level</th>
              <th colSpan="2">Players</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {

              completedGames.map(game => (
                <tr key={game.id}>
                  <td
                    className="align-middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {moment.utc(game.updated_at).local().format('YYYY-MM-DD HH:mm')}
                  </td>
                  <td
                    className="align-middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {this.renderGameLevelBadge(game.task_level)}
                  </td>

                  {this.renderPlayers(game.players)}

                  <td
                    className="align-middle"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {game.duration}
                  </td>

                  <td
                    className="align-middle"
                  >
                    {this.renderShowGameButton(`/games/${game.id}`)}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    );
  }
}

// TODO: Add selector
const mapStateToProps = state => ({
  activeGames: state.gameList.activeGames,
  completedGames: state.gameList.completedGames,
});

export default connect(mapStateToProps, null)(GameList);
