import React, {
  memo,
  useState,
  useCallback,
  useRef,
} from 'react';

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
import Placements from '../../config/placements';
import * as selectors from '../../selectors';
import DakModeButton from '../game/DarkModeButton';
import VimModeButton from '../game/VimModeButton';

const fontSizeDefault = Number(
  window.localStorage.getItem('CodebattleSpectatorEditorFontSize') || '20',
);
const setFontSizeDefault = size => (
  window.localStorage.setItem('CodebattleSpectatorEditorFontSize', size)
);

function SpectatorEditor({
  // switchedWidgetsStatus,
  // handleSwitchWidgets,
  hidingControls,
  handleSwitchHidingControls,
  playerId,
  spectatorService,
  panelClassName,
}) {
  const toolbarRef = useRef();

  const players = useSelector(selectors.gamePlayersSelector);
  const editorData = useSelector(selectors.editorDataSelector(playerId));
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const theme = useSelector(selectors.editorsThemeSelector);
  const editorsMode = useSelector(selectors.editorsModeSelector);

  const spectatorEditorState = useMachineStateSelector(spectatorService, spectatorStateSelector).value.editor;
  const isChecking = useMachineStateSelector(spectatorService, spectatorEditorIsChecking);

  const [fontSize, setFontSize] = useState(fontSizeDefault);
  const handleChangeSize = useCallback(size => {
    setFontSize(size);
    setFontSizeDefault(size);
  }, [setFontSize]);

  const handleIncreaseFontSize = useCallback(
    () => handleChangeSize(fontSize + 2),
    [handleChangeSize, fontSize],
  );
  const handleDecreaseFontSize = useCallback(
    () => handleChangeSize(fontSize - 2),
    [handleChangeSize, fontSize],
  );

  const params = {
    userId: spectatorEditorState === 'loading' ? undefined : playerId,
    editable: false,
    syntax: editorData?.currentLangSlug || 'javascript',
    mode: editorsMode,
    loading: spectatorEditorState === 'loading',
    theme,
    mute: true,
    fontSize,
  };

  const editorParams = {
    ...params,
    value: editorData?.text || '',
    onChange: () => {},
  };

  const pannelBackground = cn(panelClassName, {
    'bg-warning': isChecking,
  });

  return (
    <>
      <div
        className={pannelBackground}
        data-editor-state={spectatorEditorState}
      >
        <div className="card shadow-sm h-100">
          <div ref={toolbarRef} className="rounded-top border-bottom">
            <div
              className="btn-toolbar justify-content-between align-items-center m-1"
              role="toolbar"
            >
              <div className="d-flex justify-content-between">
                {!hidingControls && (
                  <>
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
                        <h5 className="pt-2 pl-2">Spectator</h5>
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
                    <div
                      className="btn-group align-items-center ml-2 mr-auto"
                      role="group"
                      aria-label="Editor size controls"
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-light rounded-left"
                        onClick={handleDecreaseFontSize}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm mr-2 btn-light border-left rounded-right"
                        onClick={handleIncreaseFontSize}
                      >
                        +
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="d-flex align-items-center justify-content-center">
                <div>
                  {/* <button */}
                  {/*   title="Swap game widgets" */}
                  {/*   type="button" */}
                  {/*   className={`btn btn-sm mr-1 rounded-lg ${switchedWidgetsStatus ? 'btn-primary' : 'btn-light'}`} */}
                  {/*   onClick={handleSwitchWidgets} */}
                  {/* > */}
                  {/*   <FontAwesomeIcon icon="exchange-alt" /> */}
                  {/* </button> */}
                  <button
                    title="Swap game widgets"
                    type="button"
                    className={`btn btn-sm mr-1 rounded-lg ${
                      !hidingControls ? 'btn-primary' : 'btn-light'
                    }`}
                    onClick={handleSwitchHidingControls}
                  >
                    <FontAwesomeIcon icon="eye" />
                  </button>
                </div>
                <LanguagePickerView
                  currentLangSlug={params.syntax}
                  isDisabled
                />
              </div>
            </div>
          </div>
          <Editor {...editorParams} />
        </div>
      </div>
    </>
  );
}

export default memo(SpectatorEditor);
