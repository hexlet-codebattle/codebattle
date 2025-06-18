import React from 'react';

import { useSelector } from 'react-redux';

import { leftEditorSelector, rightEditorSelector } from '@/selectors';

import ExtendedEditor from '../../components/Editor';
import editorThemes from '../../config/editorThemes';

function StreamEditorPanel({ orientation, roomMachineState }) {
  const editorSelector = orientation === 'left' ? leftEditorSelector : rightEditorSelector;

  const editor = useSelector(editorSelector(roomMachineState));
  const editorParams = {
    editable: false,
    syntax: editor?.currentLangSlug,
    theme: editorThemes.dark,
    mute: true,
    loading: false,
    value: editor?.text,
    lineNumbers: false,
    wordWrap: 'on',
  };

  return (
    <div className={`col-8 cb-stream-editor-panel p-4 cb-stream-editor-${orientation}`}>
      <div className="d-flex flex-column flex-grow-1 position-relative cb-editor-height h-100">
        <ExtendedEditor {...editorParams} />
      </div>
    </div>
  );
}

export default StreamEditorPanel;
