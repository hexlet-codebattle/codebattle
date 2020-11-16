import React from 'react';
import cn from 'classnames';

import DarkModeButton from './DarkModeButton';
import EditorHeightButtons from './EditorHeightButtons';
import GameResultIcon from '../../components/GameResultIcon';
import LanguagePicker from '../../components/LanguagePicker';
import OnlineIndicator from './OnlineIndicator';
import TypingIcon from './TypingIcon';
import UserName from '../../components/User/UserName';
import VimModeButton from './VimModeButton';

export default ({
 isRightEditor, isSpectator, player, editor,
}) => {
  const isReversedClassName = cn({
    'flex-row-reverse': isRightEditor,
  });

  const isContentEndClassName = cn('', {
    'justify-content-end': isRightEditor,
  });

  return (
    <div className={`btn-toolbar justify-content-between align-items-center m-1 ${isReversedClassName}`} role="toolbar">
      <div
        className={`btn-group align-items-center m-1 ${isReversedClassName} ${isContentEndClassName}`}
        role="group"
        aria-label="Editor settings"
      >
        <EditorHeightButtons editor={editor} />
        <LanguagePicker editor={editor} disabled={isSpectator} />
      </div>
      {!isSpectator && (
        <div className="btn-group align-items-center mr-auto" role="group" aria-label="Editor mode">
          <VimModeButton player={player} />
          <DarkModeButton player={player} />
        </div>
      )}
      <div className={`btn-group align-items-center justify-content-end m-1 ${isReversedClassName}`} role="group" aria-label="User info">
        {isSpectator && <TypingIcon editor={editor} />}
        <UserName user={player} />
        <OnlineIndicator player={player} />
        <GameResultIcon editor={editor} />
      </div>
    </div>
  );
};
