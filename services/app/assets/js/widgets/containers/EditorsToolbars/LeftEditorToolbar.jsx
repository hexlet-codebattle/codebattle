import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import _ from 'lodash';
import cn from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import GameStatusCodes from '../../config/gameStatusCodes';
import * as selectors from '../../selectors';
import { changeCurrentLangAndSetTemplate } from '../../middlewares/Game';
import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../UserInfo';
import GameResultIcon from '../../components/GameResultIcon';
import { actions } from '../../slices';
import EditorModes from '../../config/editorModes';
import EditorThemes from '../../config/editorThemes';
import EditorHeightButtons from './EditorHeightButtons';
import TypingIcon from './TypingIcon';

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

const renderNameplate = (player = {}, onlineUsers, editor, isStoredGame) => {
  const isOnline = _.find(onlineUsers, { id: player.id });

  return (
    <div className="d-none d-xl-flex align-items-center">
      {!isStoredGame && <TypingIcon editor={editor} />}
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
  const dispatch = useDispatch();

  const leftEditor = useSelector(state => selectors.leftEditorSelector(state));
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
  const setMode = nextMode => () => dispatch(actions.setEditorsMode(nextMode));
  const switchTheme = nextTheme => () => dispatch(actions.switchEditorsTheme(nextTheme));
  const setLang = langSlug => {
    dispatch(changeCurrentLangAndSetTemplate(langSlug));
    };
  const isStoredGame = gameStatus.status === GameStatusCodes.stored;
  const isDisabled = isStoredGame || !_.hasIn(players, currentUserId);

  if (leftEditorLangSlug === null) { return null; }

  return (
    <div
      className="py-1 px-3 btn-toolbar justify-content-between align-items-center"
      role="toolbar"
    >
      <div
        className="btn-group col-6 align-items-center"
        role="group"
        aria-label="Editor settings"
      >
        <LanguagePicker
          languages={languages}
          currentLangSlug={leftEditorLangSlug}
          onChangeLang={setLang}
          disabled={isDisabled}
        />
        {!isDisabled && renderVimModeBtn(setMode, leftEditorsMode)}
        {renderSwitchThemeBtn(switchTheme, theme)}
        <EditorHeightButtons
          typeEditor="left"
        />
      </div>
      <GameResultIcon
        className="ml-auto mr-2"
        resultUser1={_.get(players, [leftUserId, 'gameResult'])}
        resultUser2={_.get(players, [rightUserId, 'gameResult'])}
      />
      {renderNameplate(players[leftUserId], onlineUsers, leftEditor, isStoredGame)}
    </div>
  );
};

export default LeftEditorToolbar;
