import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

class GameCheckButton extends Component {

  static propTypes = {
    onClick: React.PropTypes.func,
    style: React.PropTypes.object,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    value: PropTypes.string.isRequired,
  }

  static defaultProps = {
    status: 'btn',
    disabled: true,
    value: 'CheckResults',
  }

  render() {
    const { onClick, } = this.props;
    const createUserBadge = user =>
    user.id && <li key={user.id}>{`${user.name}(${user.raiting})`}</li>;
    const badges = _.values(users)
    .map(createUserBadge);

    return (
      <div>
        <button
          style={{ ...buttonStyles, ...style }}
          onClick={onClick}
        >
        </button>
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
