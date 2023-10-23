import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import {
  spectatorEditorIsChecking,
  spectatorStateSelector,
} from '@/machines/selectors';
import useMachineStateSelector from '@/utils/useMachineStateSelector';

import Editor from '../../components/Editor';
import LanguagePickerView from '../../components/LanguagePickerView';
import UserInfo from '../../components/UserInfo';
import { gameRoomEditorStyles } from '../../config/editorSettings';
import Placements from '../../config/placements';
import * as selectors from '../../selectors';
import DakModeButton from '../game/DarkModeButton';
import VimModeButton from '../game/VimModeButton';

function SpectatorEditor({
  switchedWidgetsStatus,
  handleSwitchWidgets,
  playerId,
  spectatorService,
}) {
  const players = useSelector(selectors.gamePlayersSelector);
  const editorData = useSelector(selectors.editorDataSelector(playerId));
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const theme = useSelector(selectors.editorsThemeSelector(currentUserId));
  const editorsMode = useSelector(selectors.editorsModeSelector(currentUserId));

  const spectatorEditorState = useMachineStateSelector(spectatorService, spectatorStateSelector).value.editor;
  const isChecking = useMachineStateSelector(spectatorService, spectatorEditorIsChecking);

  const params = {
    userId: spectatorEditorState === 'loading' ? undefined : playerId,
    editable: false,
    syntax: editorData?.currentLangSlug || 'javascript',
    mode: editorsMode,
    loading: spectatorEditorState === 'loading',
    theme,
    mute: true,
  };

  const solutionParams = {
    ...params,
    value: editorData?.text || '',
    onChange: () => {},
  };

  const pannelBackground = cn('col-12 col-lg-6 col-xl-8 p-1', {
    'bg-warning': isChecking,
  });

  return (
    <>
      <div className={pannelBackground} data-editor-state={spectatorEditorState}>
        <div className="card h-100 shadow-sm" style={gameRoomEditorStyles}>
          <div className="rounded-top" data-player-type="current_user">
            <div className="btn-toolbar justify-content-between align-items-center m-1" role="toolbar">
              <div className="d-flex justify-content-between">
                <div className="d-flex align-items-center p-1">
                  {players[playerId] ? (
                    <div className="py-2">
                      <UserInfo
                        user={players[playerId]}
                        placement={Placements.bottomEnd}
                        hideOnlineIndicator
                      />
                    </div>
                  ) : (
                    <h5 className="pt-2 pl-2">
                      Spectator
                    </h5>
                  )}
                </div>
                <div
                  className="btn-group align-items-center ml-2 mr-auto"
                  role="group"
                  aria-label="Editor mode"
                >
                  <VimModeButton playerId={currentUserId} />
                  <DakModeButton playerId={currentUserId} />
                </div>
              </div>
              <div className="d-flex">
                <button
                  title="Swap game widgets"
                  type="button"
                  className={`btn btn-sm mr-1 rounded-lg ${switchedWidgetsStatus ? 'btn-primary' : 'btn-light'}`}
                  onClick={handleSwitchWidgets}
                >
                  <FontAwesomeIcon icon="exchange-alt" />
                </button>
                <LanguagePickerView
                  currentLangSlug={params.syntax}
                  isDisabled
                />
              </div>
            </div>
          </div>
          <div id="spectator" className="d-flex flex-column flex-grow-1 position-relative">
            <Editor key={params.userId} {...solutionParams} />
          </div>
        </div>
      </div>
    </>
  );
}

export default memo(SpectatorEditor);
