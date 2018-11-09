import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { ToastContainer, toast } from 'react-toastify';
import Hotkeys from 'react-hot-keys';
import i18n from '../../i18n';
import GameStatusCodes from '../config/gameStatusCodes';
import {
  gameStatusSelector,
  gameStatusTitleSelector,
  gameTaskSelector,
  userLangSelector,
  leftEditorSelector,
  rightEditorSelector,
  usersSelector,
  currentUserSelector,
} from '../selectors';
import { checkGameResult, sendEditorLang, sendGiveUp } from '../middlewares/Game';
import userTypes from '../config/userTypes';
import LangSelector from '../components/LangSelector';
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

class GameStatusTab extends Component {
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

  componentDidUpdate(prevProps, prevState) {
    const prevStatus = prevProps.gameStatus.status;
    const { solutionStatus, winner, status } = this.props.gameStatus;
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
      gameStatus,
      checkResult,
      currentUser,
      leftEditorLang,
      rightEditorLang,
      task,
      leftUserId,
      rightUserId,
      title,
      users,
      onlineUsers,
    } = this.props;
    const userType = currentUser.type;
    const isSpectator = userType === userTypes.spectator;
    const allowedGameStatusCodes = [GameStatusCodes.playing, GameStatusCodes.gameOver];
    const canGiveUp = gameStatus.status === GameStatusCodes.playing && !isSpectator;
    const canCheckResult = _.includes(allowedGameStatusCodes, gameStatus.status) &&
      userType && !isSpectator;
    const toastOptions = {
      hideProgressBar: true,
      position: toast.POSITION.TOP_CENTER,
    };

    return (
      <Hotkeys keyName="ctrl+Enter" onKeyUp={checkResult}>
        <div className="card h-100 border-0">
          <div className="row my-1">
            <div className="col">
              <div className="btn-toolbar" role="toolbar">
                <LangSelector
                  currentLangSlug={leftEditorLang}
                  onChange={this.props.setLang}
                  disabled={isSpectator}
                />
                {!canCheckResult ? null : (
                  <button
                    className="btn btn-success ml-1"
                    onClick={checkResult}
                    disabled={gameStatus.checking}
                  >
                    {gameStatus.checking ? (
                      <span className="mx-1 fa fa-cog fa-spin" />
                      ) : (
                        <span className="mx-1 fa fa-play-circle" />
                      )}
                    {i18n.t('Check')}
                  </button>
                )}
                {!canGiveUp ? null : (
                  <button
                    className="btn btn-secondary ml-3"
                    onClick={sendGiveUp}
                  >
                    {i18n.t('Give up')}
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-5">
              <div className="row text-center">
                <div className="col">
                  {renderNameplate(users[leftUserId], onlineUsers)}
                </div>
                <div className="col">
                  <span className="p-2 badge badge-danger">
                    {title}
                  </span>
                </div>
                <div className="col">
                  {renderNameplate(users[rightUserId], onlineUsers)}
                </div>
              </div>
            </div>
            <div className="col text-right">
              <LangSelector
                currentLangSlug={rightEditorLang}
                onChange={_.noop}
                disabled
              />
            </div>
          </div>
          <ToastContainer {...toastOptions} />
        </div>
      </Hotkeys>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUser = currentUserSelector(state);
  const leftUserId = _.get(leftEditorSelector(state), ['userId'], null);
  const rightUserId = _.get(rightEditorSelector(state), ['userId'], null);
  const { users: onlineUsers } = state.chat;

  return {
    users: usersSelector(state),
    leftUserId,
    rightUserId,
    currentUser,
    onlineUsers,
    leftEditorLang: userLangSelector(leftUserId, state),
    rightEditorLang: userLangSelector(rightUserId, state),
    gameStatus: gameStatusSelector(state),
    title: gameStatusTitleSelector(state),
    task: gameTaskSelector(state),
  };
};

const mapDispatchToProps = dispatch => ({
  checkResult: () => dispatch(checkGameResult()),
  setLang: langSlug => dispatch(sendEditorLang(langSlug)),
});

export default connect(mapStateToProps, mapDispatchToProps)(GameStatusTab);
