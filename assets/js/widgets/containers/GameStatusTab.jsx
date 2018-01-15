import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { ToastContainer, toast } from 'react-toastify';
import i18n from '../../i18n';
import { usersSelector, currentUserSelector } from '../selectors/user';
import GameStatusCodes from '../config/gameStatusCodes';
import {
  gameStatusSelector,
  gameStatusTitleSelector,
  gameTaskSelector,
} from '../redux/GameRedux';
import {
  langSelector,
  leftEditorSelector,
  rightEditorSelector,
} from '../selectors/editor';
import { checkGameResult, sendEditorLang, sendGiveUp } from '../middlewares/Game';
import userTypes from '../config/userTypes';
import LangSelector from '../components/LangSelector';

const renderNameplate = (user) => {
  const userName = _.get(user, ['name'], '');
  const rating = _.get(user, ['rating'], '');
  const ratingStr = _.isFinite(rating) ? ` (${rating})` : '';
  return (
    <p> {`${userName}${ratingStr}`} </p>
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
  }

  componentDidUpdate() {
    const { solutionStatus, winner } = this.props.gameStatus;
    const { currentUser } = this.props;
    const statuses = {
      true: () => toast.success('Yay! All tests passed!'),
      false: () => toast.error('Oh no, some test has failed!'),
      null: () => null,
    };

    statuses[solutionStatus]();
    if (winner.id) {
      winner.id === currentUser.id ?
        toast.success('Congratulations! You have won the game!') :
        toast.error('Oh snap! Your opponent has won the game :(');
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
      users,
    } = this.props;
    const userType = currentUser.type;
    const isSpectator = userType === userTypes.spectator;
    const allowedGameStatusCodes = [GameStatusCodes.playing, GameStatusCodes.playerWon];
    const canGiveUp = gameStatus.status === GameStatusCodes.playing && !isSpectator;
    const canCheckResult = _.includes(allowedGameStatusCodes, gameStatus.status) &&
      userType && !isSpectator;
    const toastOptions = {
      hideProgressBar: true,
      position: toast.POSITION.TOP_CENTER,
    };

    return (
      <div className="card h-100 border-0">
        <div className="row my-1">
          <div className="col">
            <div className="btn-toolbar" role="toolbar">
              <LangSelector
                currentLangSlug={leftEditorLang.slug}
                onChange={this.props.setLang}
                disabled={isSpectator}
              />
              {!canCheckResult ? null : (
                <button
                  className="btn btn-success ml-1"
                  onClick={checkResult}
                  disabled={gameStatus.checking}
                >
                  {gameStatus.checking ? i18n.t('Checking...') : i18n.t('Check result')}
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
          <div className="col">
            <div className="row text-center">
              <div className="col">
                {renderNameplate(users[leftUserId])}
              </div>
              <div className="col">
                <span className="p-2 badge badge-danger">
                  {gameStatus.status}
                </span>
              </div>
              <div className="col">
                {renderNameplate(users[rightUserId])}
              </div>
            </div>
          </div>
          <div className="col text-right">
            <LangSelector
              currentLangSlug={rightEditorLang.slug}
              onChange={_.noop}
              disabled
            />
          </div>
        </div>
        <ToastContainer {...toastOptions} />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUser = currentUserSelector(state);
  const leftUserId = _.get(leftEditorSelector(state), ['userId'], null);
  const rightUserId = _.get(rightEditorSelector(state), ['userId'], null);

  return {
    users: usersSelector(state),
    leftUserId,
    rightUserId,
    currentUser,
    leftEditorLang: langSelector(leftUserId, state),
    rightEditorLang: langSelector(rightUserId, state),
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
