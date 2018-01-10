import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import _ from 'lodash';
import i18n from '../../i18n';
import { usersSelector, currentUserSelector } from '../selectors/user';
import GameStatuses from '../config/gameStatuses';
import {
  gameStatusSelector,
  gameStatusTitleSelector,
  gameTaskSelector,
} from '../redux/GameRedux';
import {
  langSelector,
  leftEditorSelector,
  rightEditorSelector,
} from '../redux/EditorRedux';
import { checkGameResult, sendEditorLang, sendGiveUp } from '../middlewares/Game';
import userTypes from '../config/userTypes';
import LangSelector from '../components/LangSelector';
import languages from '../config/languages';

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
    status: GameStatuses.initial,
    title: '',
    users: {},
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
    const allowedGameStatuses = [GameStatuses.playing, GameStatuses.playerWon];
    const canGiveUp = gameStatus.status === GameStatuses.playing && !isSpectator;
    const canCheckResult = _.includes(allowedGameStatuses, gameStatus.status) &&
      userType && !isSpectator;

    return (
      <div className="card h-100 border-0">
        <div className="row my-1">
          <div className="col">
            <div className="btn-toolbar" role="toolbar">
              {isSpectator ? (
                <button
                  className="btn btn-info"
                  type="button"
                  disabled
                >
                  {languages[leftEditorLang]}
                </button>
              ) : (
                <LangSelector currentLangKey={leftEditorLang} onChange={this.props.setLang} />
              )}
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
            {!rightUserId ? null : (
              <button
                className="btn btn-info"
                type="button"
                disabled
              >
                {languages[rightEditorLang]}
              </button>
            )}
          </div>
        </div>
        <div className="row">
          {gameStatus.solutionStatus === false ? (
            <div className="alert alert-danger alert-dismissible fade show">
              {i18n.t('Checking failed')}
            </div>
          ) : null}
          {gameStatus.solutionStatus === true ? (
            <div className="col">
              <div className="alert alert-success alert-dismissible fade show" role="alert">
                {i18n.t('All test are passed!!11')}
                <button type="button" className="close" data-dismiss="alert" aria-label="Close">
                  <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: '&times;' }} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
  setLang: langKey => dispatch(sendEditorLang(langKey)),
});

export default connect(mapStateToProps, mapDispatchToProps)(GameStatusTab);
