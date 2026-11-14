// Python language server in the browser: basedpyright's web-worker build, spoken to over
// JSON-RPC (LSP) with postMessage. Loaded lazily by CodeEditor for editable Python editors.
// Monaco's bundled LSP client is not used: it opens every model of every language and
// registers its providers for all languages.
import pyrightWorkerUrl from 'browser-basedpyright/dist/pyright.worker.js?url';
import type * as Monaco from 'monaco-editor';

import { languageServerModels } from './completions';
import { monaco } from './monaco';

const ROOT = '/codebattle';
const MARKER_OWNER = 'pyright';
// Plain checks only: basedpyright's default ("recommended") flags every untyped parameter.
const CONFIG = { typeCheckingMode: 'basic', reportMissingModuleSource: false };

type Json = unknown;
interface RpcMessage {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: Json;
  result?: Json;
  error?: { message: string };
}

interface LspPosition {
  line: number;
  character: number;
}
interface LspRange {
  start: LspPosition;
  end: LspPosition;
}
interface MarkupContent {
  kind: string;
  value: string;
}
type Documentation = string | MarkupContent | undefined;
interface TextEdit {
  range: LspRange;
  newText: string;
}
interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: Documentation;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: TextEdit | { insert: LspRange; replace: LspRange; newText: string };
  additionalTextEdits?: TextEdit[];
  tags?: number[];
}
interface LspDiagnostic {
  range: LspRange;
  severity?: number;
  message: string;
  code?: string | number;
  tags?: number[];
}

function workerUrl() {
  if (!import.meta.env.DEV) return pyrightWorkerUrl;
  // Phoenix (:4000) and Vite (:8081) are different origins: start a same-origin classic worker
  // that loads the Vite-served script (see createWorker in ./monaco).
  const url = new URL(pyrightWorkerUrl, import.meta.url).href;
  return URL.createObjectURL(new Blob([`importScripts(${JSON.stringify(url)});`], { type: 'text/javascript' }));
}

class PyrightClient {
  private readonly foreground: Worker;
  private readonly workers: Worker[] = [];
  private readonly pending = new Map<number, { resolve: (value: Json) => void; reject: (error: Error) => void }>();
  private nextId = 1;
  readonly ready: Promise<void>;

  constructor() {
    const url = workerUrl();
    this.foreground = new Worker(url, { name: 'pyright' });
    this.workers.push(this.foreground);
    this.foreground.addEventListener('message', ({ data }: MessageEvent) => {
      // The server runs its checker in a second worker, created through the page.
      if (data?.type === 'browser/newWorker') {
        const background = new Worker(url, { name: `pyright-background-${this.workers.length}` });
        this.workers.push(background);
        background.postMessage({ type: 'browser/boot', mode: 'background', initialData: data.initialData, port: data.port }, [data.port]);
        return;
      }
      if (data?.jsonrpc === '2.0') this.receive(data as RpcMessage);
    });
    // A worker that fails to load or crashes fails every call (and the start).
    this.foreground.addEventListener('error', () => {
      for (const call of this.pending.values()) call.reject(new Error('Pyright worker failed'));
      this.pending.clear();
    });
    this.foreground.postMessage({ type: 'browser/boot', mode: 'foreground' });
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.request('initialize', {
      processId: null,
      rootUri: `file://${ROOT}`,
      workspaceFolders: [{ uri: `file://${ROOT}`, name: 'codebattle' }],
      capabilities: {
        textDocument: {
          synchronization: { dynamicRegistration: false },
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              tagSupport: { valueSet: [1] },
              resolveSupport: { properties: ['documentation', 'detail'] },
            },
          },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          signatureHelp: {
            signatureInformation: { documentationFormat: ['markdown', 'plaintext'], parameterInformation: { labelOffsetSupport: true } },
          },
          publishDiagnostics: { tagSupport: { valueSet: [1, 2] } },
        },
      },
      // The server's in-memory file system: typeshed is built in, this adds the config.
      initializationOptions: { files: { [`${ROOT}/pyrightconfig.json`]: JSON.stringify(CONFIG) } },
    });
    this.notify('initialized', {});
  }

  request<T = Json>(method: string, params: Json): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: Json) => void, reject });
      this.foreground.postMessage({ jsonrpc: '2.0', id, method, params });
    });
  }

  terminate() {
    for (const worker of this.workers) worker.terminate();
  }

  notify(method: string, params: Json) {
    this.foreground.postMessage({ jsonrpc: '2.0', method, params });
  }

  onDiagnostics?: (uri: string, diagnostics: LspDiagnostic[]) => void;

  private receive(message: RpcMessage) {
    if (message.method === undefined && typeof message.id === 'number') {
      const call = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) call?.reject(new Error(message.error.message));
      else call?.resolve(message.result);
      return;
    }
    if (message.method === 'textDocument/publishDiagnostics') {
      const { uri, diagnostics } = message.params as { uri: string; diagnostics: LspDiagnostic[] };
      this.onDiagnostics?.(uri, diagnostics);
    }
    // Server → client requests (registerCapability, workDoneProgress/create, …): acknowledge.
    if (message.id !== undefined) this.foreground.postMessage({ jsonrpc: '2.0', id: message.id, result: null });
  }
}

let client: PyrightClient | null = null;
const documents = new Map<string, Monaco.editor.ITextModel>();
const uris = new WeakMap<Monaco.editor.ITextModel, string>();
let nextDocument = 1;

const toPosition = (position: Monaco.IPosition): LspPosition => ({ line: position.lineNumber - 1, character: position.column - 1 });
const toRange = ({ start, end }: LspRange): Monaco.IRange => ({
  startLineNumber: start.line + 1,
  startColumn: start.character + 1,
  endLineNumber: end.line + 1,
  endColumn: end.character + 1,
});
const toMarkdown = (doc: Documentation): Monaco.IMarkdownString | undefined =>
  doc === undefined ? undefined : typeof doc === 'string' ? { value: doc } : { value: doc.value };

// LSP CompletionItemKind (1-based) → Monaco's enum.
function completionKind(kind: number | undefined) {
  const K = monaco.languages.CompletionItemKind;
  const kinds = [K.Text, K.Method, K.Function, K.Constructor, K.Field, K.Variable, K.Class, K.Interface, K.Module, K.Property,
    K.Unit, K.Value, K.Enum, K.Keyword, K.Snippet, K.Color, K.File, K.Reference, K.Folder, K.EnumMember, K.Constant,
    K.Struct, K.Event, K.Operator, K.TypeParameter];
  return kinds[(kind ?? 1) - 1] ?? K.Text;
}

function markerSeverity(severity: number | undefined) {
  const S = monaco.MarkerSeverity;
  return [S.Error, S.Warning, S.Info, S.Hint][(severity ?? 1) - 1] ?? S.Error;
}

function toCompletion(item: LspCompletionItem, wordRange: Monaco.IRange): Monaco.languages.CompletionItem & { lsp: LspCompletionItem } {
  const edit = item.textEdit;
  const range = !edit ? wordRange : 'range' in edit ? toRange(edit.range) : { insert: toRange(edit.insert), replace: toRange(edit.replace) };
  return {
    lsp: item,
    label: item.label,
    kind: completionKind(item.kind),
    detail: item.detail,
    documentation: toMarkdown(item.documentation),
    sortText: item.sortText,
    filterText: item.filterText,
    insertText: edit?.newText ?? item.insertText ?? item.label,
    insertTextRules: item.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
    range,
    additionalTextEdits: item.additionalTextEdits?.map(({ range: editRange, newText }) => ({ range: toRange(editRange), text: newText })),
    tags: item.tags?.includes(1) ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
  };
}

function startClient() {
  const pyright = new PyrightClient();
  pyright.onDiagnostics = (uri, diagnostics) => {
    const model = documents.get(uri);
    if (!model || model.isDisposed()) return;
    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      diagnostics.map((diagnostic) => ({
        ...toRange(diagnostic.range),
        severity: markerSeverity(diagnostic.severity),
        message: diagnostic.message,
        source: 'pyright',
        code: diagnostic.code?.toString(),
        tags: diagnostic.tags?.filter((tag) => tag === 1 || tag === 2),
      })),
    );
  };

  // Only models attached below are answered; any other Python editor gets nothing from here.
  const uriOf = (model: Monaco.editor.ITextModel) => uris.get(model);

  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '[', '"', "'"],
    async provideCompletionItems(model, position) {
      const uri = uriOf(model);
      if (!uri) return undefined;
      const result = await pyright.request<{ items: LspCompletionItem[] } | LspCompletionItem[] | null>('textDocument/completion', {
        textDocument: { uri },
        position: toPosition(position),
      });
      const items = Array.isArray(result) ? result : (result?.items ?? []);
      const word = model.getWordUntilPosition(position);
      const wordRange = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      return { suggestions: items.map((item) => toCompletion(item, wordRange)) };
    },
    async resolveCompletionItem(item) {
      const { lsp } = item as Monaco.languages.CompletionItem & { lsp?: LspCompletionItem };
      if (!lsp) return item;
      const resolved = await pyright.request<LspCompletionItem>('completionItem/resolve', lsp);
      return { ...item, detail: resolved.detail ?? item.detail, documentation: toMarkdown(resolved.documentation) ?? item.documentation };
    },
  });

  monaco.languages.registerHoverProvider('python', {
    async provideHover(model, position) {
      const uri = uriOf(model);
      if (!uri) return undefined;
      const hover = await pyright.request<{ contents: Documentation; range?: LspRange } | null>('textDocument/hover', {
        textDocument: { uri },
        position: toPosition(position),
      });
      const contents = toMarkdown(hover?.contents);
      return contents ? { contents: [contents], range: hover?.range && toRange(hover.range) } : undefined;
    },
  });

  monaco.languages.registerSignatureHelpProvider('python', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    async provideSignatureHelp(model, position) {
      const uri = uriOf(model);
      if (!uri) return undefined;
      const help = await pyright.request<{
        signatures: { label: string; documentation?: Documentation; parameters?: { label: string | [number, number]; documentation?: Documentation }[] }[];
        activeSignature?: number;
        activeParameter?: number;
      } | null>('textDocument/signatureHelp', { textDocument: { uri }, position: toPosition(position) });
      if (!help?.signatures.length) return undefined;
      return {
        value: {
          signatures: help.signatures.map((signature) => ({
            label: signature.label,
            documentation: toMarkdown(signature.documentation),
            parameters: (signature.parameters ?? []).map((parameter) => ({ label: parameter.label, documentation: toMarkdown(parameter.documentation) })),
          })),
          activeSignature: help.activeSignature ?? 0,
          activeParameter: help.activeParameter ?? 0,
        },
        dispose: () => {},
      };
    },
  });

  return pyright;
}

/**
 * Starts Pyright on first use and keeps the model in sync with it. Resolves once the server
 * answers, so the keyword completions cover the seconds it takes to load; returns the detach.
 */
export async function attachPythonLsp(model: Monaco.editor.ITextModel) {
  client ??= startClient();
  const pyright = client;
  try {
    await pyright.ready;
  } catch (error) {
    // The next Python editor tries again.
    if (client === pyright) client = null;
    pyright.terminate();
    throw error;
  }
  if (model.isDisposed()) return () => {};

  const uri = `file://${ROOT}/solution_${nextDocument++}.py`;
  documents.set(uri, model);
  uris.set(model, uri);
  languageServerModels.add(model);
  pyright.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'python', version: model.getVersionId(), text: model.getValue() } });
  const changes = model.onDidChangeContent(() =>
    pyright.notify('textDocument/didChange', { textDocument: { uri, version: model.getVersionId() }, contentChanges: [{ text: model.getValue() }] }),
  );

  let detached = false;
  const detach = () => {
    if (detached) return;
    detached = true;
    changes.dispose();
    willDispose.dispose();
    documents.delete(uri);
    uris.delete(model);
    languageServerModels.delete(model);
    if (!model.isDisposed()) monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
    pyright.notify('textDocument/didClose', { textDocument: { uri } });
  };
  const willDispose = model.onWillDispose(detach);
  return detach;
}
