import React from 'react';
import cn from 'classnames';
import DarkModeButton from './DarkModeButton';
import GameResultIcon from '../../components/GameResultIcon';
import LanguagePicker from '../../components/LanguagePicker';
import UserInfo from '../UserInfo';
import VimModeButton from './VimModeButton';
import GameActionButtons from '../../components/GameActionButtons';

const ModeButtons = ({ player }) => (
  <div
    className="btn-group align-items-center mr-auto"
    role="group"
    aria-label="Editor mode"
  >
    <VimModeButton player={player} />
    <DarkModeButton player={player} />
  </div>
);

const EditorToolbar = ({
  type,
  player,
  score,
  editor,
  toolbarClassNames,
  editorSettingClassNames,
  userInfoClassNames,
  langPickerStatus,
  actionBtnsProps,
  showControlBtns,
}) => {
  const scoreResultClass = cn('ml-2', {
    'cb-game-score-won': score.winnerId === player.id,
    'cb-game-score-lost': (score.winnerId !== null) && (score.winnerId !== player.id),
    'cb-game-score-draw': score.winnerId === null,
  });
  return (
    <>
      <div data-player-type={type}>
        <div className={toolbarClassNames} role="toolbar">
          <div
            className={editorSettingClassNames}
            role="group"
            aria-label="Editor settings"
          >
            <LanguagePicker editor={editor} status={langPickerStatus} />
          </div>

          {showControlBtns && (
            <>
              <ModeButtons player={player} />
              <GameActionButtons {...actionBtnsProps} />
            </>
          )}

          <div className={userInfoClassNames} role="group" aria-label="User info">
            <UserInfo user={player} />
            <div className={scoreResultClass}>
              Score:
              {score.score}
            </div>
          </div>
        </div>
      </div>

      <div
        className="position-absolute"
        style={{
          bottom: '5%', right: '5%', opacity: '0.5', zIndex: '100',
        }}
      >
        <GameResultIcon editor={editor} />
      </div>
    </>
);
};

export default EditorToolbar;
