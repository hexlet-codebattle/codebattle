import React, { type Ref } from 'react';

import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../../components/UserInfo';
import GameRoomModes from '../../config/gameModes';
import Placements from '../../config/placements';

// import DarkModeButton from './DarkModeButton';
import CopyEditorButton from './CopyEditorButton';
import EditorResultIcon from './EditorResultIcon';
import GameActionButtons from './GameActionButtons';
import GameBanPlayerButton from './GameBanPlayerButton';
import GameReportButton from './GameReportButton';
import GameResultIcon from './GameResultIcon';
import UserHeadToHead from './UserHeadToHead';
import VimModeButton from './VimModeButton';

import { type Player } from '../../slices/initial';

interface ModeButtonsProps {
  player: Player;
}

function ModeButtons({ player }: ModeButtonsProps) {
  return (
    <div className="btn-group align-items-center mr-auto" role="group" aria-label="Editor mode">
      <VimModeButton playerId={player.id} />
      {/* <DarkModeButton playerId={player.id} /> */}
    </div>
  );
}

interface EditorToolbarEditor {
  userId?: number;
  text?: string;
  currentLangSlug?: string;
  [key: string]: unknown;
}

interface EditorToolbarProps {
  gameId?: number;
  toolbarRef?: Ref<HTMLDivElement>;
  type?: string;
  mode?: string;
  status?: string;
  player: Player;
  editorState?: string;
  tournamentId?: number;
  editor: EditorToolbarEditor;
  toolbarClassNames?: string;
  editorSettingClassNames?: string;
  userInfoClassNames?: string;
  langPickerStatus?: string;
  actionBtnsProps?: React.ComponentProps<typeof GameActionButtons>;
  showControlBtns?: boolean;
  hideToolbarControls?: boolean;
  isAdmin?: boolean;
  isHistory?: boolean;
}

function EditorToolbar({
  gameId,
  toolbarRef,
  type,
  mode,
  status,
  player,
  editorState,
  tournamentId,
  editor,
  toolbarClassNames,
  editorSettingClassNames,
  userInfoClassNames,
  langPickerStatus,
  actionBtnsProps,
  showControlBtns,
  hideToolbarControls = false,
  isAdmin = false,
  isHistory = false,
}: EditorToolbarProps) {
  return (
    <>
      <div
        ref={toolbarRef}
        className="cb-bg-panel cb-toolbar cb-border-color rounded-top"
        data-player-type={type}
      >
        <div className={toolbarClassNames} role="toolbar">
          <div className="d-flex justify-content-between">
            <div className={editorSettingClassNames} role="group" aria-label="Editor settings">
              <LanguagePicker editor={editor} status={langPickerStatus} />
            </div>
            {showControlBtns && !isHistory && <ModeButtons player={player} />}
          </div>

          <div className="d-flex justify-content-between">
            {showControlBtns && !isHistory && editorState !== 'banned' && (
              <GameActionButtons
                {...(actionBtnsProps as React.ComponentProps<typeof GameActionButtons>)}
              />
            )}
            {!showControlBtns && !hideToolbarControls && (
              <div className="py-2" role="group" aria-label="Report actions">
                <GameReportButton userId={player.id} gameId={gameId as number} />
                {isAdmin && (
                  <>
                    <GameBanPlayerButton
                      userId={player.id}
                      status={status as string}
                      tournamentId={tournamentId as number}
                    />
                    <CopyEditorButton editor={editor as { text: string }} />
                  </>
                )}
              </div>
            )}
            <div className={userInfoClassNames} role="group" aria-label="User info">
              <UserInfo
                {...({ mode: 'dark' } as Partial<React.ComponentProps<typeof UserInfo>>)}
                user={player}
                placement={
                  Placements.bottomEnd as React.ComponentProps<typeof UserInfo>['placement']
                }
              />
              {mode === GameRoomModes.standard && <UserHeadToHead userId={player.id} />}
            </div>
          </div>
        </div>
      </div>
      <EditorResultIcon>
        <GameResultIcon userId={editor.userId as number} />
      </EditorResultIcon>
    </>
  );
}

export default EditorToolbar;
