import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import i18n from '../../i18n';
import _ from 'lodash';
import { usersSelector, currentUserIdSelector } from '../redux/UserRedux';
import GameStatuses from '../config/gameStatuses';
import {
  gameStatusSelector,
  gameStatusTitleSelector,
} from '../redux/GameRedux';
import { checkGameResult } from '../middlewares/Game';
import userTypes from '../config/userTypes';

class GameStatusTab extends Component {
  static propTypes = {
    users: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      raiting: PropTypes.number,
    }),
    status: PropTypes.string,
    title: PropTypes.string,
  }

  static defaultProps = {
    status: GameStatuses.initial,
    title: '',
    users: {},
  }

  render() {
    const { users, status, title, checkResult, currentUserId } = this.props;
    const createUserBadge = user =>
      user.id && <li key={user.id}>{`${user.name}(${user.raiting})`}</li>;
    const badges = _.values(users)
      .map(createUserBadge);
    const userType = _.get(users[currentUserId], 'type', null);
    const allowedGameStatuses = [GameStatuses.playing, GameStatuses.playerWon];
    const canCheckResult = _.includes(allowedGameStatuses, status) &&
      userType &&
      (userType !== userTypes.spectator);

    return (
      <div className="card mt-4 h-100 border-0">
        {!canCheckResult ? null :
          <button
            className="btn btn-success"
            onClick={checkResult}
          >
            {i18n.t('Check result')}
          </button>
        }
        <h2>{title}</h2>
        <p>Players</p>
        <ul>{badges}</ul>
        {status}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  users: usersSelector(state),
  currentUserId: currentUserIdSelector(state),
  status: gameStatusSelector(state).status,
  title: gameStatusTitleSelector(state),
});

const mapDispatchToProps = dispatch => ({
  checkResult: () => dispatch(checkGameResult())
});

export default connect(mapStateToProps, mapDispatchToProps)(GameStatusTab);
