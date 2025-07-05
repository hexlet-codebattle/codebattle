import React from 'react';

import { useSelector } from 'react-redux';

import { leftEditorSelector, rightEditorSelector } from '@/selectors';

import ExtendedEditor from '../../components/Editor';
import editorThemes from '../../config/editorThemes';

function StreamEditorPanel({
  orientation, roomMachineState, fontSize, width = '60%',
}) {
  const editorSelector = orientation === 'left' ? leftEditorSelector : rightEditorSelector;

  const editor = useSelector(editorSelector(roomMachineState));
  const editorParams = {
    editable: false,
    syntax: editor?.currentLangSlug,
    theme: editorThemes.custom,
    mute: true,
    loading: false,
    value: editor?.text || '',
    fontSize,
    lineNumbers: 'off',
    wordWrap: 'on',
    showVimStatusBar: false,
    scrollbarStatus: 'hidden',
    // Add required props
    onChange: () => { },
    mode: 'default',
    roomMode: 'spectator',
    checkResult: () => { },
    userType: 'spectator',
    userId: editor?.playerId,
  };

  return (
    <div
      className={`cb-stream-editor-panel p-2 mt-4 cb-stream-editor-${orientation}`}
      style={{ width, maxWidth: width, minWidth: width }}
    >
      <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100 px-2 pt-2">
        <ExtendedEditor {...editorParams} />
      </div>
    </div>
  );
}

export default StreamEditorPanel;
