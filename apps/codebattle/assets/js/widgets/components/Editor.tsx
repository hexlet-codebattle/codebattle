import React, { memo, useRef, useEffect } from 'react';

import MonacoEditor from '@monaco-editor/react';
import { Box } from '@mantine/core';
import { initVimMode } from 'monaco-vim';

import '../initEditor';
import languages from '../config/languages';
import useEditor from '../utils/useEditor';

import EditorLoading from './EditorLoading';

interface EditorProps {
  value?: string;
  syntax?: keyof typeof languages;
  onChange?: (value: string | undefined) => void;
  theme?: string;
  loading?: boolean;
  mode?: string;
  // Remaining props are forwarded to useEditor (typed loosely there).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

function Editor(props: EditorProps) {
  const { value, syntax = 'js', onChange, theme, loading = false, mode } = props;

  // Map your custom language key to an actual Monaco recognized language
  const mappedSyntax = languages[syntax];

  // Hooks from your custom editor config
  const {
    options,
    handleEditorDidMount: originalEditorDidMount,
    handleEditorWillMount,
  } = useEditor(props);

  // Create a ref for the actual Monaco editor instance
  // Monaco editor + monaco namespace are typed loosely (no shared type here).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  // Create a ref for the Vim status element
  const vimStatusRef = useRef<HTMLDivElement>(null);
  // Create a ref to hold the vimMode controller so we can dispose if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vimModeRef = useRef<any>(null);

  // Wrap your existing "didMount" to store editor and call original if needed
  const handleEditorDidMount = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor: any, monaco: any) => {
      editorRef.current = editor;

      if (typeof originalEditorDidMount === 'function') {
        originalEditorDidMount(editor, monaco);
      }
    },
    [originalEditorDidMount],
  );
  // Whenever `mode` changes, enable or disable vimMode
  useEffect(() => {
    // If we haven't mounted the editor yet, exit
    if (!editorRef.current) return;

    if (mode === 'vim') {
      // If not already in Vim mode, enable it
      if (!vimModeRef.current) {
        vimModeRef.current = initVimMode(editorRef.current, vimStatusRef.current);
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
        // Options object is assembled loosely in useEditor; Monaco's option type is stricter.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options={options as any}
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
      <Box
        bg="dark.4"
        c="white"
        ref={vimStatusRef}
        style={{
          padding: '4px 8px',
          fontFamily: 'monospace',
          borderTop: '1px solid #4c4c5a',
        }}
      />

      <EditorLoading loading={loading} />
    </>
  );
}

export default memo(Editor);
