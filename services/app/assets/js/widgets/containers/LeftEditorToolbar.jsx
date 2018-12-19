import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { ToastContainer, toast } from 'react-toastify';
// import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import { checkGameResult, changeCurrentLangAndSetTemplate } from '../middlewares/Game';
import userTypes from '../config/userTypes';
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

const renderWinnerTrophy = ({ solutionStatus, winner, status }, leftUserId) => {
  if (status === GameStatusCodes.gameOver && winner.id === leftUserId) {
    return <i className="fa fa-trophy fa-2x text-warning" aria-hidden="true" />;
  }

  return null;
};

class LeftEditorToolbar extends Component {
  static propTypes = {
    users: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      rating: PropTypes.number,
    }),
    status: PropTypes.string,
    title: PropTypes.string,
  }

  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    users: {},
    onlineUsers: [],
  }

  componentDidUpdate(prevProps) {
    const prevStatus = prevProps.gameStatus.status;
    const { gameStatus: { solutionStatus, winner, status } } = this.props;
    const { currentUser } = this.props;
    const statuses = {
      true: () => toast.success('Yay! All tests passed!'),
      false: () => toast.error('Oh no, some test has failed!'),
      null: () => null,
    };

    statuses[solutionStatus]();
    if (status === GameStatusCodes.gameOver && prevStatus !== status) {
      if (winner.id === currentUser.id) {
        toast.success('Congratulations! You have won the game!');
      } else {
        toast.error('Oh snap! Your opponent has won the game :(');
      }
    }
  }

  render() {
    const {
      currentUser,
      leftEditorLangSlug,
      leftUserId,
      users,
      onlineUsers,
      setLang,
      gameStatus,
    } = this.props;
    const userType = currentUser.type;
    const isSpectator = userType === userTypes.spectator;
    const toastOptions = {
      hideProgressBar: true,
      position: toast.POSITION.TOP_CENTER,
    };

    if (leftEditorLangSlug === null) {
      return null;
    }

    return (
      <Fragment>
        <div className="btn-toolbar justify-content-between" role="toolbar">
          <LanguagePicker
            currentLangSlug={leftEditorLangSlug}
            onChange={setLang}
            disabled={isSpectator}
          />
          {renderWinnerTrophy(gameStatus, leftUserId)}
          {renderNameplate(users[leftUserId], onlineUsers)}
        </div>
        <ToastContainer {...toastOptions} />
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUser = selectors.currentUserSelector(state);
  const leftUserId = _.get(selectors.leftEditorSelector(state), ['userId'], null);
  const rightUserId = _.get(selectors.rightEditorSelector(state), ['userId'], null);
  const { users: onlineUsers } = state.chat;

  return {
    users: selectors.usersSelector(state),
    leftUserId,
    rightUserId,
    currentUser,
    onlineUsers,
    leftEditorLangSlug: selectors.userLangSelector(leftUserId)(state),
    rightEditorLangSlug: selectors.userLangSelector(rightUserId)(state),
    gameStatus: selectors.gameStatusSelector(state),
    title: selectors.gameStatusTitleSelector(state),
    task: selectors.gameTaskSelector(state),

  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
  setLang: changeCurrentLangAndSetTemplate,
};

export default connect(mapStateToProps, mapDispatchToProps)(LeftEditorToolbar);
