import React, { useState, useEffect } from 'react';
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
import { setEditorsMode, switchEditorsTheme } from '../../actions';
import EditorModes from '../../config/editorModes';
import EditorThemes from '../../config/editorThemes';
import EditorHeightButtons from './EditorHeightButtons';

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

  const text = useSelector(state => selectors.editorTextsSelector(state));
  const keys = Object.keys(text);
  const leftGamerText = keys[1];
  const [showTyping, setShowTyping] = useState(true);
  useEffect(() => {
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
    }, 500);
  }, [text[leftGamerText]]);

  const isOnline = _.find(onlineUsers, { id: player.id });

  return (
    <div className="d-flex align-items-center">
      <div>
        <FontAwesomeIcon icon="keyboard" className={`text-info ml-2 ${showTyping ? 'shown' : 'hidden'}`} />
      </div>
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
  const isStoredGame = gameStatus.status === GameStatusCodes.stored;
  const isSpectator = isStoredGame || !_.hasIn(players, currentUserId);

  if (leftEditorLangSlug === null) { return null; }

  return (
    <div
      className="py-2 px-3 btn-toolbar justify-content-between align-items-center"
      role="toolbar"
    >
      <div className="btn-group" role="group" aria-label="Editor settings">
        <LanguagePicker
          languages={languages}
          currentLangSlug={leftEditorLangSlug}
          onChange={setLang}
          disabled={isSpectator}
        />
        {!isSpectator && renderVimModeBtn(setMode, leftEditorsMode)}
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
      {renderNameplate(players[leftUserId], onlineUsers)}
    </div>
  );
};

export default LeftEditorToolbar;
