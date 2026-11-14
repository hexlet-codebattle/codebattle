import './monaco';

import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { Loader, useComputedColorScheme, useMantineTheme } from '@mantine/core';
import type { VimAdapterInstance } from 'monaco-vim';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { RemoteCursor } from '@/features/game/store';
import type { GameTask } from '@/features/game/types';
import { useLatest } from '@/shared/useLatest';

import { insertSpaces, monacoLanguage, tabSize } from './monaco';
import { guardForeignEditor, guardOwnEditor } from './pasteGuard';
import { useEditorPrefs } from './prefs';
import { type ContentChangeEvent, contentMetrics, SYNC_EDIT_SOURCE, type TelemetryEvent } from './telemetry';
import { resolveTheme } from './themes';
import { initEditorVim } from './vim';
import classes from './CodeEditor.module.css';

type CodeEditorInstance = Parameters<OnMount>[0];

const EDITOR_PADDING_TOP = 8;

type Attach = (model: NonNullable<ReturnType<CodeEditorInstance['getModel']>>) => () => void;

/** Lazily loaded completion helpers by language slug. */
const TYPED_HELPERS: Record<string, () => Promise<Attach>> = {
  cpp: () => import('./cpp').then((module) => module.attachCpp),
  dlang: () => import('./d').then((module) => module.attachD),
  java: () => import('./java').then((module) => module.attachJava),
  golang: () => import('./go').then((module) => module.attachGo),
};

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
  /**
   * Skips the clipboard guard: an editable editor otherwise only takes pastes of text copied
   * from itself, a read-only one can't be copied from.
   */
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
  /** The player's caret / selection, drawn into their editor for the opponent and spectators. */
  remoteCursor?: RemoteCursor | null;
  /** A Monaco theme name instead of the editor preference (e.g. `cb-stream` for OBS). */
  theme?: string;
  /** The task's arguments: their types type `def solution(...)` for the Ruby completions. */
  taskSignature?: GameTask['input_signature'];
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
  remoteCursor,
  taskSignature,
}: CodeEditorProps) {
  const scheme = useComputedColorScheme('dark');
  const { fontFamilyMonospace } = useMantineTheme();
  const prefs = useEditorPrefs();
  const theme = themeOverride ?? resolveTheme(prefs.theme, scheme);
  const editorRef = useRef<CodeEditorInstance | null>(null);
  const [mounted, setMounted] = useState<CodeEditorInstance | null>(null);
  const vimRef = useRef<VimAdapterInstance | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const runRef = useLatest(onRun);
  const telemetryRef = useLatest(onTelemetry);
  const cursorRef = useLatest(onCursor);
  const valueRef = useLatest(value);
  const hoveredRef = useRef(false);
  const remoteDecorations = useRef<ReturnType<CodeEditorInstance['createDecorationsCollection']> | null>(null);
  const revealedCursor = useRef<RemoteCursor | null>(null);

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
    setMounted(editor);
    // The text may have moved on while Monaco was loading.
    if (editor.getValue() !== valueRef.current) editor.setValue(valueRef.current);

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
    // Monaco's event also carries what made each edit (typing, completion, paste, our sync).
    editor.onDidChangeModelContent((event) => {
      const metrics = contentMetrics(event as ContentChangeEvent);
      if (metrics) telemetry({ type: 'content_change', ...metrics });
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
    // While the viewer points at the editor (reading, scrolling) the remote caret doesn't pull the view.
    const node = editor.getDomNode();
    node?.addEventListener('mouseenter', () => (hoveredRef.current = true));
    node?.addEventListener('mouseleave', () => (hoveredRef.current = false));
    if (!readOnly) editor.focus();
    if (vim && !readOnly) vimRef.current = initEditorVim(editor, statusRef.current);
  };

  // Telemetry for blocked pastes goes through the same channel as the keys and edits.
  useEffect(() => {
    if (!mounted || allowClipboard) return undefined;
    if (readOnly) return guardForeignEditor(mounted);
    return guardOwnEditor(mounted, (type) =>
      telemetryRef.current?.({ text_length: mounted.getModel()?.getValueLength(), type }),
    );
  }, [mounted, readOnly, allowClipboard, telemetryRef]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (vim && !readOnly && !vimRef.current) vimRef.current = initEditorVim(editor, statusRef.current);
    if ((!vim || readOnly) && vimRef.current) {
      vimRef.current.dispose();
      vimRef.current = null;
    }
  }, [vim, readOnly]);

  useEffect(
    () => () => {
      vimRef.current?.dispose();
      vimRef.current = null;
    },
    [],
  );

  // Pyright for an editable Python editor with autocomplete on (completions, hovers, signatures,
  // errors). It loads in the background (a few MB, cached); the keyword completions cover the wait.
  const pythonLsp = prefs.autocomplete && !readOnly && lang === 'python';
  useEffect(() => {
    const model = mounted?.getModel();
    if (!pythonLsp || !model) return;
    let detach: (() => void) | undefined;
    let cancelled = false;
    import('./pythonLsp')
      .then(({ attachPythonLsp }) => attachPythonLsp(model))
      .then((attached) => (cancelled ? attached() : (detach = attached)))
      .catch((error: unknown) => console.warn('Python language server unavailable', error));
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [mounted, pythonLsp]);

  // C++, D, Java, Go: our own completions, parameter hints and hovers for the standard library.
  const typedHelpers = prefs.autocomplete && !readOnly ? TYPED_HELPERS[lang] : undefined;
  useEffect(() => {
    const model = mounted?.getModel();
    if (!typedHelpers || !model) return;
    let detach: (() => void) | undefined;
    let cancelled = false;
    typedHelpers()
      .then((attach) => {
        if (!cancelled) detach = attach(model);
      })
      .catch((error: unknown) => console.warn(`${lang} completions unavailable`, error));
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [mounted, typedHelpers, lang]);

  // Ruby: the same for the core library, with the task's argument types (./ruby).
  const rubyHelpers = prefs.autocomplete && !readOnly && lang === 'ruby';
  const signatureKey = JSON.stringify(taskSignature ?? []);
  useEffect(() => {
    const model = mounted?.getModel();
    if (!rubyHelpers || !model) return;
    let detach: (() => void) | undefined;
    let cancelled = false;
    import('./ruby')
      .then(({ attachRuby }) => {
        if (!cancelled) detach = attachRuby(model, JSON.parse(signatureKey) as NonNullable<GameTask['input_signature']>);
      })
      .catch((error: unknown) => console.warn('Ruby completions unavailable', error));
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [mounted, rubyHelpers, signatureKey]);

  // The editor isn't controlled through @monaco-editor/react's `value`: it syncs in a passive
  // effect, which can run after the next keystroke with the previous render's text and then
  // replaces the whole model (lost or repeated characters, the cursor jumping, re-highlighting).
  // A layout effect runs in the same commit, so `value` is either my own latest edit (already
  // in the model) or an outside change: language switch, reset, the opponent's code.
  useLayoutEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || model.getValue() === value) return;
    if (readOnly) {
      editor.setValue(value);
      return;
    }
    editor.pushUndoStop();
    editor.executeEdits(SYNC_EDIT_SOURCE, [{ range: model.getFullModelRange(), text: value, forceMoveMarkers: true }]);
    editor.pushUndoStop();
  }, [value, readOnly]);

  // Drawn after the text sync above (same commit), so the offsets land in the text they came with;
  // a new text alone re-places the decorations, a new caret also scrolls it into view.
  useLayoutEffect(() => {
    const model = mounted?.getModel();
    if (!mounted || !model) return;
    remoteDecorations.current ??= mounted.createDecorationsCollection();
    if (!remoteCursor) {
      remoteDecorations.current.clear();
      return;
    }
    const start = model.getPositionAt(remoteCursor.from);
    const end = model.getPositionAt(remoteCursor.to);
    const caret = { startLineNumber: end.lineNumber, startColumn: end.column, endLineNumber: end.lineNumber, endColumn: end.column };
    remoteDecorations.current.set([
      ...(remoteCursor.from === remoteCursor.to
        ? []
        : [
            {
              range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column },
              options: { className: 'cb-remote-selection' },
            },
          ]),
      { range: caret, options: { beforeContentClassName: 'cb-remote-caret' } },
    ]);
    if (revealedCursor.current !== remoteCursor && !hoveredRef.current) mounted.revealRangeInCenterIfOutsideViewport(caret);
    revealedCursor.current = remoteCursor;
  }, [mounted, remoteCursor, value]);

  return (
    <div className={classes.root}>
      <div className={classes.editor}>
        <MonacoEditor
          defaultValue={value}
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
            quickSuggestions: prefs.autocomplete,
            suggestOnTriggerCharacters: prefs.autocomplete,
            wordBasedSuggestions: prefs.autocomplete ? 'currentDocument' : 'off',
            parameterHints: { enabled: prefs.autocomplete },
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
            dropIntoEditor: { enabled: allowClipboard },
            lineNumbersMinChars: 3,
          }}
        />
      </div>
      {vim && !readOnly && <div ref={statusRef} className={classes.vimStatus} />}
    </div>
  );
}
