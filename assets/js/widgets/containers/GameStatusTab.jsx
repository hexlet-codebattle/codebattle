import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import ReactMarkdown from 'react-markdown';
import i18n from '../../i18n';
import { usersSelector, currentUserIdSelector } from '../redux/UserRedux';
import GameStatuses from '../config/gameStatuses';
import {
  gameStatusSelector,
  gameStatusTitleSelector,
  gameTaskSelector,
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
    const { users, status, title, checkResult, currentUserId, task } = this.props;
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
        {!canCheckResult ? null : (
          <button
            className="btn btn-success"
            onClick={checkResult}
          >
            {i18n.t('Check result')}
          </button>
        )}
        <h2>{title}</h2>
        {_.isEmpty(task) ? null : (
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">{task.name}</h4>
              <h6 className="card-subtitle text-muted">
                {`${i18n.t('Level')}: ${task.level}`}
              </h6>
              <ReactMarkdown
                className="card-text"
                source={task.description}
              />
            </div>
          </div>
        )}
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
  task: gameTaskSelector(state),
});

const mapDispatchToProps = dispatch => ({
  checkResult: () => dispatch(checkGameResult()),
});

export default connect(mapStateToProps, mapDispatchToProps)(GameStatusTab);
