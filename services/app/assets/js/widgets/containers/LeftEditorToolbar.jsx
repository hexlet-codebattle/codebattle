import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import GameStatusCodes from '../config/gameStatusCodes';
import * as selectors from '../selectors';
import {
  changeCurrentLangAndSetTemplate, compressEditorHeight,
  expandEditorHeight,
} from '../middlewares/Game';
import LanguagePicker from '../components/LanguagePicker';
import UserInfo from './UserInfo';
import GameResultIcon from '../components/GameResultIcon';
import { setEditorsMode, switchEditorsTheme } from '../actions';
import EditorModes from '../config/editorModes';
import EditorThemes from '../config/editorThemes';

const renderEditorHeightButtons = (compressEditor, expandEditor, userId) => (
  <div className="btn-group btn-group-sm ml-2" role="group" aria-label="Editor height">
    <button
      type="button"
      className="btn btn-sm btn-light border rounded"
      onClick={compressEditor(userId)}
    >
      <i className="fas fa-compress-arrows-alt" aria-hidden="true" />
    </button>
    <button
      type="button"
      className="btn btn-sm btn-light border rounded ml-2"
      onClick={expandEditor(userId)}
    >
      <i className="fas fa-expand-arrows-alt" aria-hidden="true" />
    </button>
  </div>
);

const renderVimModeBtn = (setMode, leftEditorsMode) => {
  const isVimMode = leftEditorsMode === EditorModes.vim;
  const nextMode = isVimMode ? EditorModes.default : EditorModes.vim;
  const classNames = cn('btn btn-sm border rounded ml-2', {
    'btn-light': !isVimMode,
    'btn-secondary': isVimMode,
  });

  return (
    <button type="button" className={classNames} onClick={setMode(nextMode)}>
      Vim
    </button>
  );
};

const renderSwitchThemeBtn = (switchTheme, theme) => {
  const isDarkTheme = theme === EditorThemes.dark;
  const nextTheme = isDarkTheme ? EditorThemes.light : EditorThemes.dark;
  const classNames = cn('btn btn-sm border rounded ml-2', {
    'btn-light': !isDarkTheme,
    'btn-secondary': isDarkTheme,
  });
  const text = isDarkTheme ? 'Dark' : 'Light';

  return (
    <button type="button" className={classNames} onClick={switchTheme(nextTheme)}>
      {text}
    </button>
  );
};
const renderNameplate = (player = {}, onlineUsers) => {
  const isOnline = _.find(onlineUsers, { id: player.id });

  return (
    <div className="d-flex align-items-center">
      <UserInfo user={player} />
      <div>
        {isOnline ? (
          <FontAwesomeIcon icon="snowman" className="text-success ml-2" />
        ) : (
          <FontAwesomeIcon icon="skull-crossbones" className="text-secondary ml-2" />
        )}
      </div>
    </div>
  );
};

const LeftEditorToolbar = () => {
  const leftUserId = useSelector(state => _.get(selectors.leftEditorSelector(state), ['userId'], null));
  const rightUserId = useSelector(state => _.get(selectors.rightEditorSelector(state), ['userId'], null));
  const languages = useSelector(state => selectors.editorLangsSelector(state));
  const currentUserId = useSelector(state => selectors.currentUserIdSelector(state));
  const onlineUsers = useSelector(state => selectors.chatUsersSelector(state));
  const leftEditorLangSlug = useSelector(state => selectors.userLangSelector(leftUserId)(state));
  const gameStatus = useSelector(state => selectors.gameStatusSelector(state));
  const players = useSelector(state => selectors.gamePlayersSelector(state));
  const leftEditorsMode = useSelector(state => selectors.editorsModeSelector(leftUserId)(state));
  const theme = useSelector(state => selectors.editorsThemeSelector(leftUserId)(state));

  const dispatch = useDispatch();
  const setMode = nextMode => () => dispatch(setEditorsMode(nextMode));
  const switchTheme = nextTheme => () => dispatch(switchEditorsTheme(nextTheme));
  const setLang = langSlug => dispatch(changeCurrentLangAndSetTemplate(langSlug));
  const compressEditor = userId => () => dispatch(compressEditorHeight(userId));
  const expandEditor = userId => () => dispatch(expandEditorHeight(userId));

  const isStoredGame = gameStatus.status === GameStatusCodes.stored;
  const isSpectator = isStoredGame || !_.hasIn(players, currentUserId);

  if (leftEditorLangSlug === null) { return null; }

  return (
    <div
      className="py-2 px-3 btn-toolbar justify-content-between align-items-center"
      role="toolbar"
    >
      <div className="btn-group " role="group" aria-label="Editor settings">
        <LanguagePicker
          languages={languages}
          currentLangSlug={leftEditorLangSlug}
          onChange={setLang}
          disabled={isSpectator}
        />
        {!isSpectator && renderVimModeBtn(setMode, leftEditorsMode)}
        {renderSwitchThemeBtn(switchTheme, theme)}
        {renderEditorHeightButtons(compressEditor, expandEditor, leftUserId)}
      </div>
      <GameResultIcon
        className="ml-auto mr-2"
        resultUser1={_.get(players, [[leftUserId], 'gameResult'])}
        resultUser2={_.get(players, [[rightUserId], 'gameResult'])}
      />
      {renderNameplate(players[leftUserId], onlineUsers)}
    </div>
  );
};

export default LeftEditorToolbar;
