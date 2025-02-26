/* eslint-disable no-bitwise */
import {
 useState, useEffect, useCallback, useMemo,
} from 'react';

import GameRoomModes from '../config/gameModes';
import sound from '../lib/sound';

import getLanguageTabSize, { shouldReplaceTabsWithSpaces } from './editor';
import useCursorUpdates from './useCursorUpdates';
import useEditorCursor from './useEditorCursor';
import useResizeListener from './useResizeListener';

const defaultEditorPlaceholder = 'Please! Help me!!!';

let editorClipboard = '';

/**
 * @param {object} editor
 * @param {{
 *   canSendCursor: boolean,
 *   wordWrap: string,
 *   lineNumbers: string,
 *   fontSize: number,
 *   editable: boolean,
 *   roomMode: string,
 *   checkResult: Function,
 *   toggleMuteSound: Function,
 *   mute: boolean,
 *   userType: string,
 * }} props
 */
const useOption = (
  editor,
  {
    userType,
    canSendCursor,
    wordWrap,
    lineNumbers,
    syntax,
    fontSize,
    editable,
    loading,
  },
) => {
  const options = useMemo(
    () => ({
      placeholder: defaultEditorPlaceholder,
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

      // Custom options for codebattle editor callbacks
      userType,
      canSendCursor,
    }),
    [
      userType,
      canSendCursor,
      wordWrap,
      lineNumbers,
      syntax,
      fontSize,
      editable,
      loading,
    ],
  );

  useEffect(() => {
    if (editor) {
      editor.updateOptions(options);
    }
  }, [editor, options]);

  return options;
};

/**
 * @param {{
 *   wordWrap: string,
 *   lineNumbers: string,
 *   fontSize: number,
 *   editable: boolean,
 *   roomMode: string,
 *   checkResult: Function,
 *   toggleMuteSound: Function,
 *   mute: boolean,
 *   userType: string,
 *   userId: number,
 *   onChangeCursorSelection: Function,
 *   onChangeCursorPosition: Function,
 * }} props
 */
const useEditor = props => {
  const [editor, setEditor] = useState();
  const [monaco, setMonaco] = useState();
  // const convertRemToPixels = rem => rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  // this.statusBarHeight = lineHeight = current fontSize * 1.5
  // this.statusBarHeight = convertRemToPixels(1) * 1.5;

  const options = useOption(editor, props);
  useCursorUpdates(editor, monaco, props);
  useEditorCursor(editor);
  useResizeListener(editor, props);

  const handleEnterCtrPlusS = useCallback(e => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) e.preventDefault();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleEnterCtrPlusS);

    return () => {
      window.removeEventListener('keydown', handleEnterCtrPlusS);
    };
  }, [handleEnterCtrPlusS]);

  // if (editor) {
  //   const model = editor.getModel();
  //
  //   // fix flickering in editor
  //   model.forceTokenization(model.getLineCount());
  // }

  const handleEditorWillMount = () => {};

  const handleEditorDidMount = (currentEditor, currentMonaco) => {
    setEditor(currentEditor);
    setMonaco(currentMonaco);

    const {
 editable, roomMode, checkResult, toggleMuteSound,
} = props;

    // Handle copy event
    // editor.onDidCopyText(event => {
    //   // Custom copy logic
    //   const customText = `Custom copied text: ${event.text}`;
    //   navigator.clipboard.writeText(customText);
    //   event.preventDefault();
    // });

    currentEditor.onKeyDown(e => {
      // Custom Copy Event
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        if (!editable) {
          return;
        }
        const selection = currentEditor
          .getModel()
          .getValueInRange(currentEditor.getSelection());
        editorClipboard = `___CUSTOM_COPIED_TEXT___${selection}`;
      }

      // Custom Paste Event
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        console.log(editorClipboard);
        if (editorClipboard.startsWith('___CUSTOM_COPIED_TEXT___')) {
          const customText = editorClipboard.replace(
            '___CUSTOM_COPIED_TEXT___',
            '',
          );

          currentEditor.executeEdits('custom-paste', [
            {
              range: currentEditor.getSelection(),
              text: customText,
              forceMoveMarkers: true,
            },
          ]);
        }

        e.preventDefault();
      }
    });

    if (editable && roomMode !== GameRoomModes.builder) {
      currentEditor.focus();
    }

    if (checkResult) {
      currentEditor.addAction({
        id: 'codebattle-check-keys',
        label: 'Codebattle check start',
        keybindings: [
          currentMonaco.KeyMod.CtrlCmd | currentMonaco.KeyCode.Enter,
        ],
        run: () => {
          if (!currentEditor.getOptions().readOnly) {
            checkResult();
          }
        },
      });
    } else {
      currentEditor.addCommand(
        currentMonaco.KeyMod.CtrlCmd | currentMonaco.KeyCode.Enter,
        () => null,
      );
    }

    currentEditor.addAction({
      id: 'codebattle-mute-keys',
      label: 'Codebattle mute sound',
      keybindings: [currentMonaco.KeyMod.CtrlCmd | currentMonaco.KeyCode.KEY_M],
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
