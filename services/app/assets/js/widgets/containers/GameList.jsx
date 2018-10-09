import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import { fetchState } from '../middlewares/Lobby';
import GameStatusCodes from '../config/gameStatusCodes';
import Gon from 'gon';

class GameList extends React.Component {
  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
  }

  renderPlayers = users => <span>{users.map(({ name, rating }) => `${name}(${rating})`).join(', ')}</span>

  renderGameLevelBadge = (level) => {
    const levels = {
      elementary: 'info',
      easy: 'success',
      medium: 'warning',
      hard: 'danger',
    };

    return <h5><span className={`badge badge-${levels[level]}`}>{level}</span></h5>;
  }

  isPlayer = (user, game) => !_.isEmpty(_.find(game.users, { id: user.id }))

  renderGameActionButton = (game) => {
    const gameUrl = game => `/games/${game.game_id}`;
    const user = Gon.getAsset('current_user');

    switch (game.game_info.state) {
      case GameStatusCodes.waitingOpponent:
        switch (this.isPlayer(user, game)) {
          case true:
            return (
              <div>
                <button
                  className="btn btn-info btn-sm mr-2"
                  data-method="get"
                  data-to={gameUrl(game)}
                > Show
                </button>
                <button
                  className="btn btn-danger btn-sm mr-2"
                  data-method="delete"
                  data-csrf={window.csrf_token}
                  data-to={gameUrl(game)}
                > Cancel
                </button>
              </div>
            );

          case false:
            return (
              <button
                className="btn btn-success btn-sm"
                data-method="post"
                data-csrf={window.csrf_token}
                data-to={`${gameUrl(game)}/join`}
              > Join
              </button>
            );
        }
      case GameStatusCodes.playing:
        return (
          <button
            className="btn btn-info btn-sm mr-2"
            data-method="get"
            data-to={gameUrl(game)}
          > Show
          </button>
        );
      default:
        return '';
    }
  }
  render() {
    const { games } = this.props;
    const gameUrl = game => `/games/${game.game_id}`;
    return (
      <div>
        <h1>List of games</h1>
        <p>Total: {games.length}</p>
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              <th>Id</th>
              <th>Level</th>
              <th>Players</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {
              games.map(game => (
                <tr
                  key={game.game_id}
                >

                  <td>{game.game_id}</td>
                  <td>{this.renderGameLevelBadge(game.game_info.level)}</td>

                  <td>{this.renderPlayers(game.users)}</td>
                  <td>{game.game_info.state}</td>

                  <td>{this.renderGameActionButton(game)}</td>
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
  games: state.gameList.games,
});

export default connect(mapStateToProps, null)(GameList);
