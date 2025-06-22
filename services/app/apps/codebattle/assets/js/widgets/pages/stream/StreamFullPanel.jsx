import React from 'react';

import { useSelector } from 'react-redux';

import ExtendedEditor from '@/components/Editor';
import {
  leftEditorSelector, rightEditorSelector,
} from '@/selectors';

import editorThemes from '../../config/editorThemes';
import TaskDescriptionMarkdown from '../game/TaskDescriptionMarkdown';

function StreamFullPanel({
  game, roomMachineState, fontSize, codeFontSize,
}) {
  const leftEditor = useSelector(leftEditorSelector(roomMachineState));
  const rightEditor = useSelector(rightEditorSelector(roomMachineState));
  // const leftOutput = useSelector(leftExecutionOutputSelector(roomMachineState));
  // const rightOutput = useSelector(rightExecutionOutputSelector(roomMachineState));

  const editorLeftParams = {
    editable: false,
    syntax: leftEditor?.currentLangSlug,
    theme: editorThemes.custom,
    mute: true,
    loading: false,
    value: leftEditor?.text || '',
    fontSize: codeFontSize,
    lineNumbers: false,
    wordWrap: 'on',
    showVimStatusBar: false,
    // Add required props
    onChange: () => { },
    mode: 'default',
    roomMode: 'spectator',
    checkResult: () => { },
    userType: 'spectator',
    userId: leftEditor?.playerId,
  };
  const editorRightParams = {
    editable: false,
    syntax: rightEditor?.currentLangSlug,
    theme: editorThemes.custom,
    mute: true,
    loading: false,
    value: rightEditor?.text || '',
    fontSize: codeFontSize,
    lineNumbers: false,
    wordWrap: 'on',
    showVimStatusBar: false,
    // Add required props
    onChange: () => { },
    mode: 'default',
    roomMode: 'spectator',
    checkResult: () => { },
    userType: 'spectator',
    userId: rightEditor?.playerId,
  };

  return (
    <div className="d-flex col-12 flex-column w-100 h-100 cb-stream-full-info">
      <div className="d-flex w-100 justify-content-between pb-3 px-2">
        <div className="cb-stream-tasks-stats">
          <span style={{ fontSize }}>3/8 Задача</span>
        </div>
        <div className="cb-stream-task-description h-100 w-100 px-2" style={{ fontSize }}>
          <TaskDescriptionMarkdown description={game?.task?.descriptionRu} />
        </div>
        <div className="d-flex flex-column pb-4">
          <div className="d-flex cb-stream-output mt-2 mb-1" style={{ fontSize }}>
            <div className="d-flex align-items-center cb-stream-output-title">Входные данные</div>
            <div />
          </div>
          <div className="d-flex cb-stream-output mt-2 mb-1" style={{ fontSize }}>
            <div className="d-flex align-items-center cb-stream-output-title">Ожидаемые данные</div>
            <div />
          </div>
        </div>
      </div>
      <div className="d-flex w-100 h-100 cb-stream-full-editors">
        <div className="col-4 cb-stream-full-editor editor-right">
          <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100">
            <ExtendedEditor {...editorLeftParams} />
          </div>
        </div>
        <div className="col-4 w-100 px-2">stream</div>
        <div className="col-4 cb-stream-full-editor editor-right">
          <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100">
            <ExtendedEditor {...editorRightParams} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamFullPanel;
