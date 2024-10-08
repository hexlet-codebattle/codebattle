import React from 'react';

import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../../components/UserInfo';
import GameRoomModes from '../../config/gameModes';
import Placements from '../../config/placements';

import DarkModeButton from './DarkModeButton';
import EditorResultIcon from './EditorResultIcon';
import GameActionButtons from './GameActionButtons';
import GameResultIcon from './GameResultIcon';
import TournamentUserGameScore from './TournamentUserGameScore';
import UserGameScore from './UserGameScore';

const ModeButtons = ({ player }) => (
  <div
    className="btn-group align-items-center mr-auto"
    role="group"
    aria-label="Editor mode"
  >
    <DarkModeButton playerId={player.id} />
  </div>
);

const EditorToolbar = ({
  toolbarRef,
  type,
  mode,
  player,
  editor,
  toolbarClassNames,
  editorSettingClassNames,
  userInfoClassNames,
  langPickerStatus,
  actionBtnsProps,
  showControlBtns,
  isHistory = false,
}) => (
  <>
    <div ref={toolbarRef} className="rounded-top" data-player-type={type}>
      <div className={toolbarClassNames} role="toolbar">
        <div className="d-flex justify-content-between">
          <div
            className={editorSettingClassNames}
            role="group"
            aria-label="Editor settings"
          >
            <LanguagePicker editor={editor} status={langPickerStatus} />
          </div>
          {showControlBtns && !isHistory && <ModeButtons player={player} />}
        </div>

        <div className="d-flex justify-content-between">
          {showControlBtns && !isHistory && (
            <GameActionButtons {...actionBtnsProps} />
          )}
          <div
            className={userInfoClassNames}
            role="group"
            aria-label="User info"
          >
            <UserInfo user={player} placement={Placements.bottomEnd} />
            {mode === GameRoomModes.standard && (
              <UserGameScore userId={player.id} />
            )}
            {mode === GameRoomModes.tournament && (
              <TournamentUserGameScore userId={player.id} />
            )}
          </div>
        </div>
      </div>
    </div>
    <EditorResultIcon>
      <GameResultIcon userId={editor.userId} />
    </EditorResultIcon>
  </>
);

export default EditorToolbar;
