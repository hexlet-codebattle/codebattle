import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { usersSelector } from '../redux/UserRedux';
import GameStatuses from '../config/gameStatuses';
import {
  gameStatusSelector,
  gameStatusTitleSelector,
} from '../redux/GameRedux';

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
    const { users, status, title } = this.props;
    const createUserBadge = user =>
      user.id && <li key={user.id}>{`${user.name}(${user.raiting})`}</li>;
    const badges = _.values(users)
      .map(createUserBadge);

    return (
      <div className="card mt-4 h-100 border-0">
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
  status: gameStatusSelector(state).status,
  title: gameStatusTitleSelector(state),
});

export default connect(mapStateToProps)(GameStatusTab);
