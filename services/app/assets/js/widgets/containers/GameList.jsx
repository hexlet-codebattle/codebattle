import React from 'react';
import _ from 'lodash';
import moment from 'moment';
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


  renderPlayers = users => (<div>{users.map(({
 id, name, rating, github_id,
}) =>

    (<a
      className="nav-link"
      href={`/users/${id}`}
      key={github_id}
      style={{ display: 'inline-block' }}
    >
      <img
        className="attachment rounded mr-2"
        alt={name}
        src={`https://avatars0.githubusercontent.com/u/${github_id}`}
        style={{ width: '25px' }}
      />
      {`${name}(${rating})`}
    </a>))}
                            </div>)

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
              <div className="btn-group">
                <button
                  className="btn btn-info btn-sm"
                  data-method="get"
                  data-to={gameUrl(game)}
                > Show
                </button>
                <button
                  className="btn btn-danger btn-sm"
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
        <table className="table table-hover table-sm">
          <thead>
            <tr>
              <th>Date</th>
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

                  <td className="align-middle" style={{whiteSpace: "nowrap"}}>{moment.utc(game.game_info.inserted_at).local().format('YYYY-MM-DD HH:mm')}</td>
                  <td className="align-middle" style={{whiteSpace:"nowrap"}}>{this.renderGameLevelBadge(game.game_info.level)}</td>

                  <td className="align-middle" style={{whiteSpace:"nowrap"}}>{this.renderPlayers(game.users)}</td>
                  <td className="align-middle" style={{whiteSpace:"nowrap"}}>{game.game_info.state}</td>

                  <td className="align-middle">{this.renderGameActionButton(game)}</td>
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
