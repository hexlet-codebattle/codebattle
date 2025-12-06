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

/**
 * A small helper to generate a random string for our prefix;
 * not cryptographically secure, but enough for this example.
 */
function generateRandomPrefix() {
  return `___CUSTOM_${Math.random().toString(36).slice(2)}___`;
}

/**
 * Our in-memory clipboard storage
 */
let editorClipboard = '';
let currentClipboardPrefix = '';
let selection = '';

/**
 * @param {object} editor
 * @param {{
 *   userType: string,
 *   canSendCursor: boolean,
 *   wordWrap: string,
 *   lineNumbers: string,
 *   syntax: string,
 *   fontSize: number,
 *   editable: boolean,
 *   loading: boolean
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
      stickyScroll: { enabled: false },
      tabSize: getLanguageTabSize(syntax),
      insertSpaces: shouldReplaceTabsWithSpaces(syntax),
      lineNumbersMinChars: 3,
      fontSize,
      scrollBeyondLastLine: false,
      selectOnLineNumbers: true,
      minimap: { enabled: false },
      parameterHints: { enabled: false },
      readOnly: !editable || loading,
      contextmenu: false,
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

  const options = useOption(editor, props);
  useCursorUpdates(editor, monaco, props);
  useEditorCursor(editor);
  useResizeListener(editor, props);

  // Prevent browser "Save Page" on Ctrl+S / Cmd+S
  const handleEnterCtrPlusS = useCallback(e => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleEnterCtrPlusS);
    return () => {
      window.removeEventListener('keydown', handleEnterCtrPlusS);
    };
  }, [handleEnterCtrPlusS]);

  const handleEditorWillMount = () => { };

  const handleEditorDidMount = (currentEditor, currentMonaco) => {
    setEditor(currentEditor);
    setMonaco(currentMonaco);

    currentMonaco.editor.defineTheme('code-theme-dark', {
      base: 'vs-dark',
      inherit: true,
      colors: {
        'editor.background': '#1f1313',
      },
      rules: [],
    });
    currentMonaco.editor.defineTheme('db-theme-dark', {
      base: 'vs-dark',
      inherit: true,
      colors: {
        'editor.background': '#13181f',
      },
      rules: [],
    });

    // currentMonaco.editor.setTheme('code-theme-dark');

    const {
      editable, roomMode, checkResult, toggleMuteSound,
    } = props;

    // Intercept keydown for custom Copy, Cut, and Paste logic.
    currentEditor.onKeyDown(e => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // COPY (Ctrl+C / Cmd+C)
      if (isCtrlOrCmd && e.code === 'KeyC') {
        e.preventDefault();
        if (!editable) return;

        // Generate a new random prefix each time we copy
        currentClipboardPrefix = generateRandomPrefix();
        selection = currentEditor
          .getModel()
          .getValueInRange(currentEditor.getSelection());
        editorClipboard = currentClipboardPrefix + selection;
      }

      // CUT (Ctrl+X / Cmd+X)
      if (isCtrlOrCmd && e.code === 'KeyX') {
        e.preventDefault();
        if (!editable) return;

        // Generate a new random prefix each time we cut
        currentClipboardPrefix = generateRandomPrefix();
        selection = currentEditor
          .getModel()
          .getValueInRange(currentEditor.getSelection());
        editorClipboard = currentClipboardPrefix + selection;

        // Remove the selection from the editor
        currentEditor.executeEdits('custom-cut', [
          {
            range: currentEditor.getSelection(),
            text: '',
            forceMoveMarkers: true,
          },
        ]);
      }

      // PASTE (Ctrl+V / Cmd+V)
      if (isCtrlOrCmd && e.code === 'KeyV') {
        e.preventDefault();
        e.stopPropagation();

        // Only allow paste if it matches the exact current prefix
        if (editorClipboard.startsWith(currentClipboardPrefix)) {
          // Remove the prefix before inserting
          const customText = editorClipboard.replace(
            currentClipboardPrefix,
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
      }

      // Block Insert (paste on some systems)
      // if (e.keyCode === 45 && e.code !== 'KeyO' /* Insert key */) {
      //   e.preventDefault();
      //   e.stopPropagation();
      // }
    });

    // Disable the context menu (right-click) to block "Paste" from there
    currentEditor.onContextMenu(e => {
      // Monaco's context menu event has the DOM event nested in e.event
      if (e && e.event && e.event.preventDefault) {
        e.event.preventDefault();
      }
      return false;
    });

    // Prevent the DOM-level paste event
    const domNode = currentEditor.getDomNode();
    domNode.addEventListener(
      'paste',
      e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      },
      true,
    );

    domNode.addEventListener(
      'drop',
      e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      },
      true,
    );

    // Focus editor if it is editable and not in builder mode
    if (editable && roomMode !== GameRoomModes.builder) {
      currentEditor.focus();
    }

    // Codebattle action: Check on Ctrl+Enter
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

    // Codebattle action: toggle sound on Ctrl+M
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

    domNode.addEventListener(
      'wheel',
      e => {
        const scrollTop = currentEditor.getScrollTop();
        const scrollHeight = currentEditor.getScrollHeight();
        const clientHeight = currentEditor.getLayoutInfo().height;

        const { deltaY } = e;

        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

        const scrollingDown = deltaY > 0;
        const scrollingUp = deltaY < 0;

        const shouldBubble = (scrollingUp && atTop) || (scrollingDown && atBottom);

        if (shouldBubble) {
          // Prevent Monaco from swallowing the event
          e.preventDefault();

          // Forward the scroll to the window (including momentum scroll)
          window.scrollBy({
            top: deltaY,
            left: 0,
            behavior: 'auto', // "smooth" breaks momentum feel from touchpad
          });
        }
      },
      { passive: false }, // Needed so we can call preventDefault()
    );
  };

  return {
    options,
    handleEditorWillMount,
    handleEditorDidMount,
  };
};

export default useEditor;
