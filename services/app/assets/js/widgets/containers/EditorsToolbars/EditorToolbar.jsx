import React from 'react';
import { useSelector } from 'react-redux';
import DarkModeButton from './DarkModeButton';
import GameResultIcon from '../../components/GameResultIcon';
import LanguagePicker from '../../components/LanguagePicker';
import OnlineIndicator from './OnlineIndicator';
import TypingIcon from './TypingIcon';
import UserName from '../../components/User/UserName';
import VimModeButton from './VimModeButton';
import * as selectors from '../../selectors';
import GameStatusCodes from '../../config/gameStatusCodes';
import GameActionButtons from '../../components/GameActionButtons';

const renderGameActionButtons = (editor, disabled) => <GameActionButtons disabled={disabled} editorUser={editor.userId} modifiers="mr-2" />;

export default function EditorToolbar({
  isSpectator, player, editor, toolbarClassNames, editorSettingClassNames, userInfoClassNames,
}) {
  const { isStoredGame } = useSelector(
    state => selectors.gameStatusSelector(state).status === GameStatusCodes.stored,
  );
  const leftEditor = useSelector(state => selectors.leftEditorSelector(state));

  return (
    <div className={toolbarClassNames} style={{ minHeight: '60px' }} role="toolbar">
      <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
        <LanguagePicker editor={editor} disabled={isSpectator} />
      </div>

      {!isSpectator && (
        <div className="btn-group align-items-center mr-auto" role="group" aria-label="Editor mode">
          <VimModeButton player={player} />
          <DarkModeButton player={player} />
        </div>
      )}

      {!isSpectator && !isStoredGame && renderGameActionButtons(leftEditor, false)}

      <div className={userInfoClassNames} role="group" aria-label="User info">
        {isSpectator && <TypingIcon editor={editor} />}
        <UserName user={player} />
        <OnlineIndicator player={player} />
        <GameResultIcon editor={editor} />
      </div>
    </div>
  );
}
