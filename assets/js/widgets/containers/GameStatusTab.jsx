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
import { currentLangSelector } from '../redux/EditorRedux';
import { EditorActions } from '../redux/Actions';
import { checkGameResult, sendEditorLang } from '../middlewares/Game';
import userTypes from '../config/userTypes';
import languages from '../config/languages';

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
    const {
      users,
      gameStatus,
      title,
      checkResult,
      currentUserId,
      currentLang,
      task,
    } = this.props;
    const userType = _.get(users[currentUserId], 'type', null);
    const allowedGameStatuses = [GameStatuses.playing, GameStatuses.playerWon];
    const canCheckResult = _.includes(allowedGameStatuses, gameStatus.status) &&
      userType &&
      (userType !== userTypes.spectator);

    return (
      <div className="card mt-4 h-100 border-0">
        <h3>{title}</h3>
        <p>Players</p>
        {_.isEmpty(users) ? null : (
          <ul>
            {_.map(_.values(users), user => (
              <li key={user.id}>{`${user.name}(${user.raiting})`}</li>
            ))}
          </ul>
        )}

        <div className="row pb-1 pl-3">
          {_.map(_.keys(languages), (lang) => {
            const current = lang === currentLang;
            const className = `btn mr-3 ${current ? 'btn-secondary' : 'btn-info'}`;
            return (
              <button
                disabled={current}
                className={className}
                key={lang}
                onClick={() => this.props.setLang(lang)}
              >
                {languages[lang]}
              </button>
            );
          })}
        </div>

        {_.isEmpty(task) ? null : (
          <div className="card mb-3">
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
        <div className="row">
          <div className="col">
            {!canCheckResult ? null : (
              <div>
                <button
                  className="btn btn-success"
                  onClick={checkResult}
                  disabled={gameStatus.checking}
                >
                  {gameStatus.checking ? i18n.t('Checking...') : i18n.t('Check result')}
                </button>
              </div>
            )}
          </div>
          <div className="col text-right">
            <h3>
              <span className="p-3 badge badge-danger">
                {gameStatus.status}
              </span>
            </h3>
          </div>
        </div>
        <div className="row">
          {gameStatus.solutionStatus === false ? (
            <div className="alert alert-danger alert-dismissible fade show">
              {i18n.t('Checking failed')}
            </div>
          ) : null}
          {gameStatus.solutionStatus === true ? (
            <div className="alert alert-success alert-dismissible fade show">
              <span aria-hidden="true">{'&times;'}</span>
              {i18n.t('All test are passed!!11')}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  const currentUserId = currentUserIdSelector(state);
  return {
    users: usersSelector(state),
    currentUserId,
    currentLang: currentLangSelector(currentUserId, state),
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
