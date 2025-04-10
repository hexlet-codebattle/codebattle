import React, { memo, useRef, useEffect } from 'react';

import MonacoEditor from '@monaco-editor/react';
import { initVimMode } from 'monaco-vim';
import PropTypes from 'prop-types';

import '../initEditor';
import languages from '../config/languages';
import useEditor from '../utils/useEditor';

import EditorLoading from './EditorLoading';

function Editor(props) {
  const {
 value, syntax, onChange, theme, loading = false, mode,
} = props;

  // Map your custom language key to an actual Monaco recognized language
  const mappedSyntax = languages[syntax];

  // Hooks from your custom editor config
  const {
    options,
    handleEditorDidMount: originalEditorDidMount,
    handleEditorWillMount,
  } = useEditor(props);

  // Create a ref for the actual Monaco editor instance
  const editorRef = useRef(null);
  // Create a ref for the Vim status element
  const vimStatusRef = useRef(null);
  // Create a ref to hold the vimMode controller so we can dispose if needed
  const vimModeRef = useRef(null);

  // Wrap your existing "didMount" to store editor and call original if needed
  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;

    if (typeof originalEditorDidMount === 'function') {
      originalEditorDidMount(editor, monaco);
    }
  }
  // Whenever `mode` changes, enable or disable vimMode
  useEffect(() => {
    // If we haven't mounted the editor yet, exit
    if (!editorRef.current) return;

    if (mode === 'vim') {
      // If not already in Vim mode, enable it
      if (!vimModeRef.current) {
        vimModeRef.current = initVimMode(
          editorRef.current,
          vimStatusRef.current,
        );
      }
    } else if (vimModeRef.current) {
      // If we're switching away from Vim mode, dispose it
      vimModeRef.current.dispose();
      vimModeRef.current = null;
    }
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [mode, editorRef.current]);

  return (
    <>
      <MonacoEditor
        theme={theme}
        options={options}
        width="100%"
        height="100%"
        language={mappedSyntax}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        value={value}
        onChange={onChange}
        data-guide-id="Editor"
      />

      {/* This is for displaying normal/insert mode status in Vim */}
      <div
        ref={vimStatusRef}
        style={{
          padding: '4px 8px',
          fontFamily: 'monospace',
          borderTop: '1px solid #eaeaea',
        }}
      />

      <EditorLoading loading={loading} />
    </>
  );
}

Editor.propTypes = {
  value: PropTypes.string.isRequired,
  syntax: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  wordWrap: PropTypes.string,
  lineNumbers: PropTypes.string,
  fontSize: PropTypes.number,
  editable: PropTypes.bool,
  roomMode: PropTypes.string.isRequired,
  checkResult: PropTypes.func.isRequired,
  userType: PropTypes.string.isRequired,
  userId: PropTypes.number.isRequired,
};

Editor.defaultProps = {
  wordWrap: 'off',
  lineNumbers: 'on',
  syntax: 'js',
  fontSize: 16,
  editable: false,
  loading: false,
};

export default memo(Editor);
