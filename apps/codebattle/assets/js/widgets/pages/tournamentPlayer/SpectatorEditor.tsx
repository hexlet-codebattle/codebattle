import React, { memo, useState, useCallback, useRef } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import themeList from 'monaco-themes/themes/themelist.json';
import { useSelector } from 'react-redux';

import { spectatorEditorIsChecking, spectatorStateSelector } from '@/machines/selectors';
import useMachineStateSelector from '@/utils/useMachineStateSelector';

import ExtendedEditor from '../../components/ExtendedEditor';
import LanguagePickerView from '../../components/LanguagePickerView';
import UserInfo from '../../components/UserInfo';
import Placements from '../../config/placements';
import * as selectors from '../../selectors';
import DakModeButton from '../game/DarkModeButton';
import EditorResultIcon from '../game/EditorResultIcon';
import GameResultIcon from '../game/GameResultIcon';

const fontSizeDefault = Number(
  window.localStorage.getItem('CodebattleSpectatorEditorFontSize') || '20',
);
const setFontSizeDefault = (size: number) =>
  window.localStorage.setItem('CodebattleSpectatorEditorFontSize', String(size));

// const monacoThemeDefault = (
//   window.localStorage.getItem('CodebattleSpectatorEditorMonacoTheme') || 'Amy'
// );
const setMonacoThemeDefault = (theme: string) =>
  window.localStorage.setItem('CodebattleSpectatorEditorMonacoTheme', theme);

interface SpectatorEditorProps {
  hidingControls: boolean;
  handleSwitchHidingControls: () => void;
  playerId: number | null;
  // xstate v4 interpreter; typed loosely per migration conventions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spectatorService: any;
  panelClassName: string;
  // Extra props are forwarded from the parent but unused here.
  switchedWidgetsStatus?: boolean;
  handleSwitchWidgets?: () => void;
}

function SpectatorEditor({
  // switchedWidgetsStatus,
  // handleSwitchWidgets,
  hidingControls,
  handleSwitchHidingControls,
  playerId,
  spectatorService,
  panelClassName,
}: SpectatorEditorProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);

  // const [monacoTheme, setMonacoTheme] = useState(monacoThemeDefault);
  const [monacoTheme, setMonacoTheme] = useState('custom');

  const players = useSelector(selectors.gamePlayersSelector);
  const editorData = useSelector(selectors.editorDataSelector(playerId as number, undefined));
  const currentUserId = useSelector(selectors.currentUserIdSelector);
  const theme = useSelector(selectors.editorsThemeSelector);
  const editorsMode = useSelector(selectors.editorsModeSelector);

  const spectatorEditorState = (
    useMachineStateSelector(spectatorService, spectatorStateSelector) as {
      value: { editor: string };
    }
  ).value.editor;
  const isChecking = useMachineStateSelector(spectatorService, spectatorEditorIsChecking);

  const [fontSize, setFontSize] = useState(fontSizeDefault);
  const handleChangeSize = useCallback(
    (size: number) => {
      setFontSize(size);
      setFontSizeDefault(size);
    },
    [setFontSize],
  );
  const handleChangeMonacoTheme = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMonacoTheme(e.target.value);
      setMonacoThemeDefault(e.target.value);
      // setFontSize(size);
      // setFontSizeDefault(size);
    },
    [setMonacoTheme],
  );

  const handleIncreaseFontSize = useCallback(
    () => handleChangeSize(Math.min(42, fontSize + 0.5)),
    [handleChangeSize, fontSize],
  );
  const handleDecreaseFontSize = useCallback(
    () => handleChangeSize(Math.max(4, fontSize - 0.5)),
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
    wordWrap: 'on',
    fontFamily: 'IBM Plex Mono',
    lineNumbers: 'off',
    monacoTheme,
    value: editorData?.text || '',
    onChange: () => {},
  };

  const pannelBackground = cn(panelClassName, {
    'bg-warning': isChecking,
  });

  return (
    <div className={pannelBackground} data-editor-state={spectatorEditorState}>
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
                    {players[playerId as number] ? (
                      <div className="py-2">
                        <UserInfo
                          user={players[playerId as number]}
                          placement={
                            Placements.bottomEnd as React.ComponentProps<
                              typeof UserInfo
                            >['placement']
                          }
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
                    {/* playerId is a legacy prop DarkModeButton no longer reads; kept for runtime parity. */}
                    <DakModeButton
                      {...({ playerId: currentUserId } as React.ComponentProps<
                        typeof DakModeButton
                      >)}
                    />
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
                    {fontSize}
                  </div>

                  <div className="d-flex align-items-center">
                    <select
                      key="select_panel_mode"
                      className="form-control custom-select rounded-lg"
                      value={monacoTheme}
                      onChange={handleChangeMonacoTheme}
                    >
                      <option key="custom" value="custom">
                        custom
                      </option>
                      {Object.values(themeList).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
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
                {...({ currentLangSlug: params.syntax, isDisabled: true } as React.ComponentProps<
                  typeof LanguagePickerView
                >)}
              />
            </div>
          </div>
        </div>
        <ExtendedEditor {...editorParams} />
        <EditorResultIcon mode="spectator">
          <GameResultIcon mode="spectator" userId={params.userId as number} />
        </EditorResultIcon>
      </div>
    </div>
  );
}

export default memo(SpectatorEditor);
