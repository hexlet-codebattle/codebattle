import './monaco';

import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { Loader, useComputedColorScheme, useMantineTheme } from '@mantine/core';
import { initVimMode, type VimAdapterInstance } from 'monaco-vim';
import { useEffect, useRef } from 'react';

import { insertSpaces, monaco, monacoLanguage, tabSize } from './monaco';
import { useEditorPrefs } from './prefs';
import { contentMetrics, type TelemetryEvent } from './telemetry';
import { resolveTheme } from './themes';
import classes from './CodeEditor.module.css';

type CodeEditorInstance = Parameters<OnMount>[0];

const EDITOR_PADDING_TOP = 8;

// The in-editor clipboard (legacy useEditor): copy/cut keep text here, paste only accepts
// it back, so code from outside the game can't be pasted in. Shared by both editors.
const clipboard = { text: '', armed: false };

/** Blocks outside paste, drop and the context menu; Ctrl/Cmd+C/X/V use the in-editor clipboard. */
function guardClipboard(editor: CodeEditorInstance, onBlocked: (type: 'paste_blocked' | 'drop_blocked') => void) {
  const selectionText = () => {
    const selection = editor.getSelection();
    const model = editor.getModel();
    return selection && model ? model.getValueInRange(selection) : '';
  };

  editor.onKeyDown((event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    const { code } = event.browserEvent;

    if (code === 'KeyC' || code === 'KeyX') {
      event.preventDefault();
      clipboard.text = selectionText();
      clipboard.armed = true;
      if (code === 'KeyX' && !editor.getOption(monaco.editor.EditorOption.readOnly)) {
        const selection = editor.getSelection();
        if (selection) editor.executeEdits('cb-cut', [{ range: selection, text: '', forceMoveMarkers: true }]);
      }
    }

    if (code === 'KeyV') {
      event.preventDefault();
      event.stopPropagation();
      const selection = editor.getSelection();
      if (clipboard.armed && selection) {
        editor.executeEdits('cb-paste', [{ range: selection, text: clipboard.text, forceMoveMarkers: true }]);
      }
    }
  });

  editor.onContextMenu((event) => event.event.preventDefault());

  const node = editor.getDomNode();
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    onBlocked(event.type === 'drop' ? 'drop_blocked' : 'paste_blocked');
  };
  node?.addEventListener('paste', block, true);
  node?.addEventListener('drop', block, true);
}

/** What the editor reports for bot detection (offset and language are added by the receiver). */
export type EditorTelemetry = Omit<TelemetryEvent, 'offset_ms' | 'lang_slug'>;

/** Where my cursor / selection / scroll is, for the opponent and the broadcast. */
export interface CursorReport {
  cursor?: (offset: number) => void;
  selection?: (start: number, end: number) => void;
  scroll?: (top: number, left: number) => void;
}

interface CodeEditorProps {
  value: string;
  lang: string;
  readOnly?: boolean;
  fontSize?: number;
  vim?: boolean;
  /** Admins may paste freely; everyone else gets the in-editor clipboard only. */
  allowClipboard?: boolean;
  onChange?: (value: string) => void;
  /** Ctrl/Cmd+Enter. */
  onRun?: () => void;
  /** The Monaco instance, e.g. to draw a remote cursor (broadcast arena). */
  onEditorMount?: OnMount;
  /** Keys, edits and blocked pastes, for bot detection (my editor while I play). */
  onTelemetry?: (event: EditorTelemetry) => void;
  /** My cursor, selection and scroll, shared with the room. */
  onCursor?: CursorReport;
  /** A Monaco theme name instead of the editor preference (e.g. `cb-stream` for OBS). */
  theme?: string;
}

export function CodeEditor({
  value,
  lang,
  readOnly = false,
  fontSize = 14,
  vim = false,
  allowClipboard = false,
  onChange,
  onRun,
  onEditorMount,
  theme: themeOverride,
  onTelemetry,
  onCursor,
}: CodeEditorProps) {
  const scheme = useComputedColorScheme('dark');
  const { fontFamilyMonospace } = useMantineTheme();
  const prefs = useEditorPrefs();
  const theme = themeOverride ?? resolveTheme(prefs.theme, scheme);
  const editorRef = useRef<CodeEditorInstance | null>(null);
  const vimRef = useRef<VimAdapterInstance | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;
  const telemetryRef = useRef(onTelemetry);
  telemetryRef.current = onTelemetry;
  const cursorRef = useRef(onCursor);
  cursorRef.current = onCursor;

  const handleMount: OnMount = (editor, instance) => {
    editorRef.current = editor;
    onEditorMount?.(editor, instance);
    editor.addAction({
      id: 'codebattle-run',
      label: 'Run tests',
      keybindings: [instance.KeyMod.CtrlCmd | instance.KeyCode.Enter],
      run: () => runRef.current?.(),
    });
    const telemetry = (event: EditorTelemetry) => telemetryRef.current?.({ text_length: editor.getModel()?.getValueLength(), ...event });
    if (!allowClipboard) guardClipboard(editor, (type) => telemetry({ type }));

    editor.onKeyDown(({ browserEvent }) =>
      telemetry({
        type: 'keydown',
        key: browserEvent.key,
        code: browserEvent.code,
        ctrl_key: browserEvent.ctrlKey,
        meta_key: browserEvent.metaKey,
        alt_key: browserEvent.altKey,
      }),
    );
    editor.onDidChangeModelContent(({ changes }) => {
      const metrics = contentMetrics(changes);
      telemetry({ type: 'content_change', change_count: changes.length, net_text_delta: metrics.inserted_chars - metrics.deleted_chars, ...metrics });
    });

    // Cursor, selection and scroll: shared with the room (the broadcast draws them).
    editor.onDidChangeCursorSelection(({ selection }) => {
      const model = editor.getModel();
      if (!model || !cursorRef.current) return;
      const start = model.getOffsetAt(selection.getStartPosition());
      const end = model.getOffsetAt(selection.getEndPosition());
      if (start === end) cursorRef.current.cursor?.(start);
      else cursorRef.current.selection?.(start, end);
    });
    editor.onDidScrollChange(({ scrollTop, scrollLeft, scrollTopChanged, scrollLeftChanged }) => {
      if (scrollTopChanged || scrollLeftChanged) cursorRef.current?.scroll?.(scrollTop, scrollLeft);
    });
    if (!readOnly) editor.focus();
    if (vim && !readOnly) vimRef.current = initVimMode(editor, statusRef.current);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (vim && !readOnly && !vimRef.current) vimRef.current = initVimMode(editor, statusRef.current);
    if ((!vim || readOnly) && vimRef.current) {
      vimRef.current.dispose();
      vimRef.current = null;
    }
  }, [vim, readOnly]);

  useEffect(() => () => vimRef.current?.dispose(), []);

  return (
    <div className={classes.root}>
      <div className={classes.editor}>
        <MonacoEditor
          value={value}
          language={monacoLanguage(lang)}
          theme={theme}
          loading={<Loader size="sm" />}
          onMount={handleMount}
          onChange={(next) => onChange?.(next ?? '')}
          options={{
            readOnly,
            domReadOnly: readOnly,
            fontSize,
            tabSize: tabSize(lang),
            insertSpaces: insertSpaces(lang),
            minimap: { enabled: prefs.minimap },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: prefs.wordWrap ? 'on' : 'off',
            lineNumbers: prefs.lineNumbers,
            renderWhitespace: prefs.whitespace ? 'all' : 'selection',
            bracketPairColorization: { enabled: prefs.bracketColors },
            guides: { bracketPairs: prefs.bracketColors ? 'active' : false, indentation: true },
            stickyScroll: { enabled: prefs.stickyScroll },
            cursorSmoothCaretAnimation: prefs.smoothCursor ? 'on' : 'off',
            cursorBlinking: prefs.smoothCursor ? 'smooth' : 'blink',
            smoothScrolling: prefs.smoothCursor,
            renderLineHighlight: readOnly ? 'none' : 'line',
            fixedOverflowWidgets: true,
            padding: { top: EDITOR_PADDING_TOP, bottom: EDITOR_PADDING_TOP },
            // The design system's monospace, a little more air between lines, a firmer cursor.
            fontFamily: fontFamilyMonospace,
            fontLigatures: false,
            lineHeight: 1.6,
            letterSpacing: 0.2,
            cursorWidth: 2,
            roundedSelection: true,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            contextmenu: allowClipboard,
            lineNumbersMinChars: 3,
          }}
        />
      </div>
      {vim && !readOnly && <div ref={statusRef} className={classes.vimStatus} />}
    </div>
  );
}
