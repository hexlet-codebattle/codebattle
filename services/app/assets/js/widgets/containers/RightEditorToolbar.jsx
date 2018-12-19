import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
// import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import { checkGameResult, changeCurrentLangAndSetTemplate } from '../middlewares/Game';
import LanguagePicker from '../components/LanguagePicker';
import UserName from '../components/UserName';

const renderNameplate = (user = {}, onlineUsers) => {
  const color = _.find(onlineUsers, { id: user.id }) ? 'green' : '#ccc';
  return (
    <div>
      <UserName user={user} />
      <span
        className="d-inline ml-3 fa fa-plug"
        style={{ color }}
      />
    </div>
  );
};

const renderWinnerTrophy = ({ solutionStatus, winner, status }, rightUserId) => {
  if (status === GameStatusCodes.gameOver && winner.id === rightUserId) {
    return <i className="fa fa-trophy fa-2x text-warning" aria-hidden="true" />;
  }

  return null;
};

class RightEditorToolbar extends Component {
  static propTypes = {
    users: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      rating: PropTypes.number,
    }),
  }

  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    users: {},
    onlineUsers: [],
  }

  render() {
    const {
      rightEditorLangSlug,
      rightUserId,
      users,
      onlineUsers,
      gameStatus,
    } = this.props;

    if (rightEditorLangSlug === null) {
      return null;
    }

    return (
      <div className="btn-toolbar justify-content-between" role="toolbar">
        {renderNameplate(users[rightUserId], onlineUsers)}
        {renderWinnerTrophy(gameStatus, rightUserId)}
        <LanguagePicker
          currentLangSlug={rightEditorLangSlug}
          onChange={_.noop}
          disabled
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const rightUserId = _.get(selectors.rightEditorSelector(state), ['userId'], null);
  const { users: onlineUsers } = state.chat;

  return {
    users: selectors.usersSelector(state),
    rightUserId,
    onlineUsers,
    rightEditorLangSlug: selectors.userLangSelector(rightUserId)(state),
    gameStatus: selectors.gameStatusSelector(state),
  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
  setLang: changeCurrentLangAndSetTemplate,
};

export default connect(mapStateToProps, mapDispatchToProps)(RightEditorToolbar);
