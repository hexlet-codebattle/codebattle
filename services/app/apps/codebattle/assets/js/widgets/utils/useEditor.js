/* eslint-disable no-bitwise */
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import GameRoomModes from '../config/gameModes';
import sound from '../lib/sound';

import getLanguageTabSize, { shouldReplaceTabsWithSpaces } from './editor';
import useRemoteCursor from './useRemoteCursor';

const editorPlaceholder = 'Please! Help me!!!';

let editorClipboard = '';

const useOption = ({
  wordWrap = 'off',
  lineNumbers = 'on',
  syntax = 'js',
  fontSize = 16,
  editable = false,
  loading = false,
}) => {
  const options = useMemo(() => ({
    placeholder: editorPlaceholder,
    wordWrap,
    lineNumbers,
    stickyScroll: {
      enabled: false,
    },
    tabSize: getLanguageTabSize(syntax),
    insertSpaces: shouldReplaceTabsWithSpaces(syntax),
    lineNumbersMinChars: 3,
    fontSize,
    scrollBeyondLastLine: false,
    selectOnLineNumbers: true,
    minimap: {
      enabled: false,
    },
    parameterHints: {
      enabled: false,
    },
    readOnly: !editable || loading,
    contextmenu: editable && !loading,
    scrollbar: {
      useShadows: false,
      verticalHasArrows: true,
      horizontalHasArrows: true,
      vertical: 'visible',
      horizontal: 'visible',
      verticalScrollbarSize: 17,
      horizontalScrollbarSize: 17,
      arrowSize: 30,
    },
  }), [
    wordWrap,
    lineNumbers,
    syntax,
    fontSize,
    editable,
    loading,
  ]);

  return options;
};

const useEditor = props => {
  const [editor, setEditor] = useState();
  const [monaco, setMonaco] = useState();
  // const convertRemToPixels = rem => rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  // this.statusBarHeight = lineHeight = current fontSize * 1.5
  // this.statusBarHeight = convertRemToPixels(1) * 1.5;

  useRemoteCursor(editor, monaco, props);
  const options = useOption(props);

  const handleResize = useCallback(() => {
    if (editor) {
      editor.layout();
    }
  }, [editor]);

  // if (editor) {
  //   const model = editor.getModel();
  //
  //   // fix flickering in editor
  //   model.forceTokenization(model.getLineCount());
  // }

  useEffect(() => {
    if (editor) {
      editor.updateOptions(options);
    }
  }, [editor, options]);

  useEffect(() => {
    handleResize();
  }, [props.locked, handleResize]);

  useEffect(() => {
    const ctrPlusS = e => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) e.preventDefault();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', ctrPlusS);
    };
  }, [handleResize]);

  const handleEditorWillMount = () => {};

  const handleEditorDidMount = (newEditor, newMonaco) => {
    setEditor(newEditor);
    setMonaco(newMonaco);

    const {
      editable,
      gameMode,
      checkResult,
      toggleMuteSound,
    } = props;

    const isBuilder = gameMode === GameRoomModes.builder;

    // Handle copy event
    // editor.onDidCopyText(event => {
    //   // Custom copy logic
    //   const customText = `Custom copied text: ${event.text}`;
    //   navigator.clipboard.writeText(customText);
    //   event.preventDefault();
    // });

    newEditor.onKeyDown(e => {
      // Custom Copy Event
      if ((e.ctrlKey || e.metaKey) && e.keyCode === newMonaco.KeyCode.KEY_C) {
        const selection = newEditor.getModel().getValueInRange(newEditor.getSelection());
        editorClipboard = `___CUSTOM_COPIED_TEXT___${selection}`;

        e.preventDefault();
      }

      // Custom Paste Event
      if ((e.ctrlKey || e.metaKey) && e.keyCode === newMonaco.KeyCode.KEY_V) {
        if (editorClipboard.startsWith('___CUSTOM_COPIED_TEXT___')) {
          const customText = editorClipboard.replace('___CUSTOM_COPIED_TEXT___', '');

          newEditor.executeEdits('custom-paste', [
            {
              range: newEditor.getSelection(),
              text: customText,
              forceMoveMarkers: true,
            },
          ]);
        }

        e.preventDefault();
      }
    });

    if (editable && !isBuilder) {
      newEditor.focus();
    }

    if (checkResult) {
      newEditor.addAction({
        id: 'codebattle-check-keys',
        label: 'Codebattle check start',
        keybindings: [newMonaco.KeyMod.CtrlCmd | newMonaco.KeyCode.Enter],
        run: () => {
          if (!newEditor.getOptions().readOnly) {
            checkResult();
          }
        },
      });
    } else {
      newEditor.addCommand(
        newMonaco.KeyMod.CtrlCmd | newMonaco.KeyCode.Enter,
        () => null,
      );
    }

    newEditor.addAction({
      id: 'codebattle-mute-keys',
      label: 'Codebattle mute sound',
      keybindings: [newMonaco.KeyMod.CtrlCmd | newMonaco.KeyCode.KEY_M],
      run: () => {
        const { mute } = props;
        sound.toggle(mute ? undefined : 0);

        toggleMuteSound();
      },
    });
  };

  return {
    options,
    handleEditorWillMount,
    handleEditorDidMount,
  };
};

export default useEditor;
