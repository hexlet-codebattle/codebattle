import React from 'react';
import { connect } from 'react-redux';
// import PropTypes from 'prop-types';
import { fetchState } from '../middlewares/Lobby';

class GameList extends React.Component {
  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchState());
  }

  renderPlayers = (game) => {
    const { players } = game.data;
    return <span>{players.map(player => player.user.name).join(', ')}</span>;
  }

  render() {
    const { games } = this.props;
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {
              games.map(game => (
                <tr key={game.data.game_id}>
                  <td>{game.data.game_id}</td>
                  <td>{game.data.task.level}</td>
                  <td>{this.renderPlayers(game)}</td>
                  <td>
                    <button
                      className="btn btn-info btn-sm mr-2"
                      data-method="get"
                      data-to={`/games/${game.data.game_id}`}
                    >
                      Show
                    </button>
                    {
                      game.state === 'waiting_opponent' ?
                        <button
                          className="btn btn-success btn-sm"
                          data-method="post"
                          data-csrf={window.csrf_token}
                          data-to={`/games/${game.data.game_id}/join`}
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
  const { games } = state.gameList;
  console.log(games);
  return { games };
};

export default connect(mapStateToProps, null)(GameList);
