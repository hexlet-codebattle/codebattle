import React, { Component } from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import {
  checkGameResult,
  changeCurrentLangAndSetTemplate,
  compressEditorHeight,
  expandEditorHeight,
} from '../middlewares/Game';
import LanguagePicker from '../components/LanguagePicker';
import UserInfo from './UserInfo';
import GameResultIcon from '../components/GameResultIcon';
import { setEditorsMode, switchEditorsTheme } from '../actions';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';

class LeftEditorToolbar extends Component {
  static defaultProps = {
    status: GameStatusCodes.initial,
    title: '',
    onlineUsers: [],
  };

  renderNameplate = (player = {}, onlineUsers) => {
    const isOnline = _.find(onlineUsers, { id: player.id });

    return (
      <div className="d-flex align-items-center">
        <UserInfo user={player} />
        <div>
          {
              isOnline
                ? <FontAwesomeIcon icon="snowman" className="text-success ml-2" />
                : <FontAwesomeIcon icon="skull-crossbones" className="text-secondary ml-2" />
            }
        </div>
      </div>
    );
  };

  renderEditorHeightButtons = (compressEditor, expandEditor, userId) => (
    <div className="btn-group btn-group-sm ml-2" role="group" aria-label="Editor height">
      <button
        type="button"
        className="btn btn-sm btn-light border rounded"
        onClick={() => compressEditor(userId)}
      >
        <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-light border rounded ml-2"
        onClick={() => expandEditor(userId)}
      >
        <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
      </button>
    </div>
  );

  renderVimModeBtn = () => {
    const { setMode, leftEditorsMode } = this.props;
    const isVimMode = leftEditorsMode === EditorModes.vim;
    const nextMode = isVimMode ? EditorModes.default : EditorModes.vim;
    const classNames = cn('btn btn-sm border rounded ml-2', {
      'btn-light': !isVimMode,
      'btn-secondary': isVimMode,
    });

    return (
      <button
        type="button"
        className={classNames}
        onClick={() => setMode(nextMode)}
      >
        Vim
      </button>
    );
  }

  renderSwitchThemeBtn = () => {
    const { switchTheme, theme } = this.props;
    const isDarkTheme = theme === EditorThemes.dark;
    const nextTheme = isDarkTheme ? EditorThemes.light : EditorThemes.dark;
    const classNames = cn('btn btn-sm border rounded ml-2', {
      'btn-light': !isDarkTheme,
      'btn-secondary': isDarkTheme,
    });
    const text = isDarkTheme ? 'Dark' : 'Light';

    return (
      <button
        type="button"
        className={classNames}
        onClick={() => switchTheme(nextTheme)}
      >
        {text}
      </button>
    );
  }

  render() {
    const {
      currentUserId,
      leftEditorLangSlug,
      leftUserId,
      rightUserId,
      onlineUsers,
      setLang,
      players,
      compressEditor,
      expandEditor,
    } = this.props;

    const isSpectator = !_.hasIn(players, currentUserId);

    if (leftEditorLangSlug === null) {
      return null;
    }

    return (
      <div className="py-2 px-3 btn-toolbar justify-content-between align-items-center" role="toolbar">
        <div className="btn-group " role="group" aria-label="Editor settings">
          <LanguagePicker
            currentLangSlug={leftEditorLangSlug}
            onChange={setLang}
            disabled={isSpectator}
          />
          {!isSpectator && this.renderVimModeBtn()}
          {this.renderSwitchThemeBtn()}
          {this.renderEditorHeightButtons(compressEditor, expandEditor, leftUserId)}
        </div>
        <GameResultIcon
          className="ml-auto mr-2"
          resultUser1={_.get(players, [[leftUserId], 'gameResult'])}
          resultUser2={_.get(players, [[rightUserId], 'gameResult'])}
        />
        {this.renderNameplate(players[leftUserId], onlineUsers)}
      </div>
    );
  }
}

const mapStateToProps = state => {
  const leftUserId = _.get(selectors.leftEditorSelector(state), ['userId'], null);
  const rightUserId = _.get(selectors.rightEditorSelector(state), ['userId'], null);

  return {
    leftUserId,
    rightUserId,
    currentUserId: selectors.currentUserIdSelector(state),
    onlineUsers: selectors.chatUsersSelector(state),
    leftEditorLangSlug: selectors.userLangSelector(leftUserId)(state),
    rightEditorLangSlug: selectors.userLangSelector(rightUserId)(state),
    gameStatus: selectors.gameStatusSelector(state),
    players: selectors.gamePlayersSelector(state),
    title: selectors.gameStatusTitleSelector(state),
    task: selectors.gameTaskSelector(state),
    leftEditorsMode: selectors.editorsModeSelector(leftUserId)(state),
    theme: selectors.editorsThemeSelector(leftUserId)(state),
  };
};

const mapDispatchToProps = {
  checkResult: checkGameResult,
  setLang: changeCurrentLangAndSetTemplate,
  compressEditor: compressEditorHeight,
  expandEditor: expandEditorHeight,
  setMode: setEditorsMode,
  switchTheme: switchEditorsTheme,
};

export default connect(mapStateToProps, mapDispatchToProps)(LeftEditorToolbar);
