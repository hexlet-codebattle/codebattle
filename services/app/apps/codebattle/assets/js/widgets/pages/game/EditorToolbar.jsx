import React from 'react';

import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../../components/UserInfo';
import GameRoomModes from '../../config/gameModes';

import DarkModeButton from './DarkModeButton';
import GameActionButtons from './GameActionButtons';
import GameResultIcon from './GameResultIcon';
import UserGameScore from './UserGameScore';
import VimModeButton from './VimModeButton';

function ModeButtons({ player }) {
  return (
    <div aria-label="Editor mode" className="btn-group align-items-center mr-auto" role="group">
      <VimModeButton playerId={player.id} />
      <DarkModeButton playerId={player.id} />
    </div>
  );
}

function EditorToolbar({
  actionBtnsProps,
  editor,
  editorSettingClassNames,
  isHistory = false,
  langPickerStatus,
  mode,
  player,
  showControlBtns,
  toolbarClassNames,
  type,
  userInfoClassNames,
}) {
  return (
    <>
      <div className="rounded-top" data-player-type={type}>
        <div className={toolbarClassNames} role="toolbar">
          <div className="d-flex justify-content-between">
            <div aria-label="Editor settings" className={editorSettingClassNames} role="group">
              <LanguagePicker editor={editor} status={langPickerStatus} />
            </div>
            {showControlBtns && !isHistory && <ModeButtons player={player} />}
          </div>

          <div className="d-flex justify-content-between">
            {showControlBtns && !isHistory && <GameActionButtons {...actionBtnsProps} />}
            <div aria-label="User info" className={userInfoClassNames} role="group">
              <UserInfo user={player} />
              {mode === GameRoomModes.standard && <UserGameScore userId={player.id} />}
            </div>
          </div>
        </div>
      </div>

      <div
        className="position-absolute"
        style={{
          bottom: '5%',
          right: '5%',
          opacity: '0.5',
          zIndex: '100',
        }}
      >
        <GameResultIcon editor={editor} />
      </div>
    </>
  );
}

export default EditorToolbar;
