import { useSelector, useDispatch } from 'react-redux';
import React from 'react';
import cn from 'classnames';

import { EditorToolbarProvider } from '../../contexts/EditorToolbarContext';
import { changeCurrentLangAndSetTemplate } from '../../middlewares/Game';
import DarkModeButton from './DarkModeButton';
import EditorHeightButtons from './EditorHeightButtons';
import GameResultIcon from '../../components/GameResultIcon';
import LanguagePicker from '../../components/LanguagePicker';
import OnlineIndicator from './OnlineIndicator';
import TypingIcon from './TypingIcon';
import UserName from '../../components/User/UserName';
import VimModeButton from './VimModeButton';
import * as selectors from '../../selectors';

export default props => {
  const {
 rightEditor, leftEditor, rightUser, leftUser, resultLeftUser, resultRightUser, side, isStoredGame, isPlayer,
} = props;

  const dispatch = useDispatch();

  const languages = useSelector(state => selectors.editorLangsSelector(state));
  const setLang = langSlug => {
    dispatch(changeCurrentLangAndSetTemplate(langSlug));
  };
  const isLeftSide = side === 'left';

  const isSpectator = isStoredGame || !isPlayer;
  const isDisabled = !isLeftSide || isSpectator;

  const player = isLeftSide ? leftUser : rightUser;
  const editor = isLeftSide ? leftEditor : rightEditor;
  const resultLeftPlayer = isLeftSide ? resultLeftUser : resultRightUser;
  const resultRightPlayer = isLeftSide ? resultRightUser : resultLeftUser;
  const slug = isLeftSide ? leftEditor.currentLangSlug : rightEditor.currentLangSlug;

  if (!slug) {
    return null;
  }

  const userInfoClassNames = cn('btn-group align-items-center justify-content-end m-1', {
    'flex-row-reverse': !isLeftSide,
  });

  const editorSettingClassNames = cn('btn-group align-items-center m-1', {
    'flex-row-reverse': !isLeftSide,
    'justify-content-end': !isLeftSide,
  });

  const toolbarClassNames = cn('btn-toolbar justify-content-between align-items-center m-1', {
    'flex-row-reverse': !isLeftSide,
  });

  return (
    <div className={toolbarClassNames} role="toolbar">
      <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
        <EditorHeightButtons typeEditor={side} />
        <LanguagePicker languages={languages} currentLangSlug={slug} onChangeLang={setLang} disabled={isDisabled} />
        {!isDisabled && (
          <EditorToolbarProvider>
            <VimModeButton />
            <DarkModeButton />
          </EditorToolbarProvider>
        )}
      </div>

      <div className={userInfoClassNames} role="group" aria-label="User info">
        {isDisabled && <TypingIcon editor={editor} />}
        <UserName user={player} />
        <OnlineIndicator player={player || {}} />
        <GameResultIcon className="mx-2" resultUser1={resultLeftPlayer} resultUser2={resultRightPlayer} />
      </div>
    </div>
  );
};
