import React from 'react';
import DarkModeButton from './DarkModeButton';
import GameResultIcon from '../../components/GameResultIcon';
import LanguagePicker from '../../components/LanguagePicker';
import OnlineIndicator from './OnlineIndicator';
import TypingIcon from './TypingIcon';
import UserName from '../../components/User/UserName';
import VimModeButton from './VimModeButton';

export default ({
  isSpectator, player, editor, toolbarClassNames, editorSettingClassNames, userInfoClassNames,
}) => (
  <div className={toolbarClassNames} role="toolbar">
    <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
      <LanguagePicker editor={editor} disabled={isSpectator} />
    </div>

    {!isSpectator && (
    <div className="btn-group align-items-center mr-auto" role="group" aria-label="Editor mode">
      <VimModeButton player={player} />
      <DarkModeButton player={player} />
    </div>
      )}

    <div className={userInfoClassNames} role="group" aria-label="User info">
      {isSpectator && <TypingIcon editor={editor} />}
      <UserName user={player} />
      <OnlineIndicator player={player} />
      <GameResultIcon editor={editor} />
    </div>
  </div>
  );
