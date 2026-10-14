import { notifications } from '@mantine/notifications';

import { t } from '@/i18n';

import type { monaco } from './monaco';

type Editor = monaco.editor.IStandaloneCodeEditor;
type Blocked = 'paste_blocked' | 'drop_blocked';

// Text copied or cut from my own editor on this page. Only this (or text already in the
// editor) may be pasted back, so a solution copied from elsewhere can't be pasted in.
const MAX_SNIPPETS = 50;
const snippets: string[] = [];

const normalize = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n+$/, '');

function remember(text: string) {
  const value = normalize(text);
  if (!value) return;
  const index = snippets.indexOf(value);
  if (index !== -1) snippets.splice(index, 1);
  snippets.push(value);
  if (snippets.length > MAX_SNIPPETS) snippets.shift();
}

function allowed(editor: Editor, text: string) {
  const value = normalize(text);
  if (!value || snippets.includes(value)) return true;
  // Moving code around inside the editor (copied before a reload, say) is fine too.
  return normalize(editor.getModel()?.getValue() ?? '').includes(value);
}

// Same text Monaco puts on the clipboard: the selections joined by the EOL, or the whole
// line for an empty selection (emptySelectionClipboard).
function selectionText(editor: Editor) {
  const model = editor.getModel();
  const selections = editor.getSelections();
  if (!model || !selections) return '';
  return selections
    .map((selection) =>
      selection.isEmpty() ? model.getLineContent(selection.startLineNumber) + model.getEOL() : model.getValueInRange(selection),
    )
    .join(model.getEOL());
}

let lastNotice = 0;
function notify() {
  if (Date.now() - lastNotice < 3000) return;
  lastNotice = Date.now();
  notifications.show({ color: 'orange', message: t('Pasting from outside the editor is disabled in battles') });
}

/**
 * My editor in a game: copy/cut work as usual (and are remembered), paste only accepts what
 * came from this editor, and external drops are refused. Vim yank/put stays inside Monaco.
 */
export function guardOwnEditor(editor: Editor, onBlocked: (type: Blocked) => void) {
  const node = editor.getDomNode();
  if (!node) return undefined;
  let pasteAllowedAt = 0;

  const block = (event: Event, type: Blocked) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    onBlocked(type);
    notify();
  };

  const onCopy = (event: ClipboardEvent) => {
    // Bubble phase: Monaco has already filled the clipboard by now.
    remember(event.clipboardData?.getData('text/plain') || selectionText(editor));
  };
  // Capture phase: before Monaco's own listeners on the textarea / edit context.
  const onPaste = (event: ClipboardEvent) => {
    if (allowed(editor, event.clipboardData?.getData('text/plain') ?? '')) pasteAllowedAt = Date.now();
    else block(event, 'paste_blocked');
  };
  const onBeforeInput = (event: InputEvent) => {
    if (event.inputType === 'insertFromDrop') block(event, 'drop_blocked');
    else if (event.inputType.startsWith('insertFromPaste') && Date.now() - pasteAllowedAt > 1000) block(event, 'paste_blocked');
  };
  const onDrop = (event: DragEvent) => block(event, 'drop_blocked');

  node.addEventListener('copy', onCopy);
  node.addEventListener('cut', onCopy);
  node.addEventListener('paste', onPaste, true);
  node.addEventListener('beforeinput', onBeforeInput, true);
  node.addEventListener('drop', onDrop, true);

  // Pastes that skip the DOM event (Monaco's clipboard action reads navigator.clipboard).
  const pasted = editor.onDidPaste(() => {
    if (Date.now() - pasteAllowedAt < 1000) return;
    editor.trigger('cb-paste-guard', 'undo', null);
    onBlocked('paste_blocked');
    notify();
  });

  return () => {
    node.removeEventListener('copy', onCopy);
    node.removeEventListener('cut', onCopy);
    node.removeEventListener('paste', onPaste, true);
    node.removeEventListener('beforeinput', onBeforeInput, true);
    node.removeEventListener('drop', onDrop, true);
    pasted.dispose();
  };
}

/** Someone else's code (opponent, replay): no copying it out, no context menu. */
export function guardForeignEditor(editor: Editor) {
  const node = editor.getDomNode();
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  node?.addEventListener('copy', stop, true);
  node?.addEventListener('cut', stop, true);
  const menu = editor.onContextMenu((event) => event.event.preventDefault());

  return () => {
    node?.removeEventListener('copy', stop, true);
    node?.removeEventListener('cut', stop, true);
    menu.dispose();
  };
}
