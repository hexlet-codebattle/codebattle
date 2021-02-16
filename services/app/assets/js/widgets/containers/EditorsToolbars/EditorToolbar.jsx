import React from 'react';
import { useDispatch } from 'react-redux';

import DarkModeButton from './DarkModeButton';
import GameResultIcon from '../../components/GameResultIcon';
import LanguagePicker from '../../components/LanguagePicker';
import OnlineIndicator from './OnlineIndicator';
import TypingIcon from './TypingIcon';
import UserName from '../../components/User/UserName';
import VimModeButton from './VimModeButton';
import { actions } from '../../slices';

export default ({
  player,
  editor,
  status,
  toolbarClassNames,
  editorSettingClassNames,
  userInfoClassNames,
  langPickerStatus,
}) => {
  const dispatch = useDispatch();

  switch (langPickerStatus) {
    case 'enabled':
      return (
        <div className={toolbarClassNames} role="toolbar">
          <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
            <LanguagePicker editor={editor} disabled={false} />
          </div>

          <div className="btn-group align-items-center mr-auto" role="group" aria-label="Editor mode">
            <VimModeButton player={player} />
            <DarkModeButton player={player} />
          </div>

          <div className={userInfoClassNames} role="group" aria-label="User info">
            <UserName user={player} />
            <OnlineIndicator player={player} />
            <GameResultIcon editor={editor} />
          </div>
        </div>
);

    case 'disabled':
      return (
        <div className={toolbarClassNames} role="toolbar">
          <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
            <LanguagePicker editor={editor} disabled />
          </div>

          <div className={userInfoClassNames} role="group" aria-label="User info">
            <TypingIcon status={status} />
            <UserName user={player} />
            <OnlineIndicator player={player} />
            <GameResultIcon editor={editor} />
          </div>
        </div>
);
    default: {
      dispatch(actions.setError(new Error('unnexpected lang picker status')));
      return null;
    }
  }
};
