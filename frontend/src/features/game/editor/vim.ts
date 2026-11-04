import type { editor } from 'monaco-editor';
import { initVimMode, VimMode, type VimAdapterInstance } from 'monaco-vim';

interface InsertChanges {
  changes: unknown[];
  maybeReset: boolean;
}

// monaco-vim's CodeMirror input-field listeners are stubs. Record deletion
// keys through Monaco, and provide their bindings when Vim replays an insert.
const adapter = VimMode as typeof VimMode & {
  Vim: {
    InsertModeKey: new (key: string) => unknown;
    getVimGlobalState_: () => {
      macroModeState: { isPlaying: boolean; lastInsertModeChanges: InsertChanges };
    };
  };
};
const insertMap = adapter.keyMap as typeof adapter.keyMap & {
  'vim-insert': Record<string, (cm: VimAdapterInstance & { editor: editor.IStandaloneCodeEditor }) => void>;
};
insertMap['vim-insert'].CodebattleBackspace = (cm) => cm.editor.trigger('vim', 'deleteLeft', null);
insertMap['vim-insert'].CodebattleDelete = (cm) => cm.editor.trigger('vim', 'deleteRight', null);

export function initEditorVim(editorInstance: editor.IStandaloneCodeEditor, status: HTMLElement | null) {
  const vim = initVimMode(editorInstance, status) as VimAdapterInstance & { state: { keyMap: string } };
  const keys = editorInstance.onKeyDown((event) => {
    const key = event.browserEvent.key;
    if (key !== 'Backspace' && key !== 'Delete') return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (vim.state.keyMap !== 'vim-insert') return;
    const macro = adapter.Vim.getVimGlobalState_().macroModeState;
    if (macro.isPlaying) return;
    const changes = macro.lastInsertModeChanges;
    if (changes.maybeReset) {
      changes.changes = [];
      changes.maybeReset = false;
    }
    changes.changes.push(new adapter.Vim.InsertModeKey(`Codebattle${key}`));
  });
  vim.on('dispose', () => keys.dispose());
  return vim;
}
