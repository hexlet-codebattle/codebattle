import React from 'react';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import { fetchState } from '../middlewares/Lobby';

class GameList extends React.Component {
  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
  }

  renderPlayers = (users) => {
    return <span>{users.map(({ name, rating }) => `${name}(${rating})`).join(', ')}</span>;
  }

  renderGameLevelBadge = (level) => {
    const levels = {
      elementary: 'info',
      easy: 'success',
      medium: 'warning',
      hard: 'danger',
    };

    return <h5><span className={`badge badge-${levels[level]}`}>{level}</span></h5>;
  }

  render() {
    const { games } = this.props;
    const gameUrl = game => `/games/${game.game_id}`;
    return (
      <div>
        <h1>Game List</h1>
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
                  className={`table-${game.game_info.state === 'waiting_opponent' ? 'success' : 'default'}`}
                >
                  <td>{game.game_id}</td>
                  <td>{this.renderGameLevelBadge(game.game_info.level)}</td>

                  <td>{this.renderPlayers(game.users)}</td>
                  <td>{game.game_info.state}</td>
                  <td>
                    {game.game_info.state === 'waiting_opponent' ? null : (
                      <button
                        className="btn btn-info btn-sm mr-2"
                        data-method="get"
                        data-to={gameUrl(game)}
                      >
                        Show
                      </button>
                    )}
                    {
                      // TODO: @lazycoder please fixme to game codes
                      game.game_info.state === 'waiting_opponent' ?
                        <button
                          className="btn btn-success btn-sm"
                          data-method="post"
                          data-csrf={window.csrf_token}
                          data-to={`${gameUrl(game)}/join`}
                          >
                            Join
                          </button> :
                            null
                    }
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

const mapStateToProps = (state) => {
  // TODO: Add selector
  return { games: state.gameList.games };
};

export default connect(mapStateToProps, null)(GameList);
