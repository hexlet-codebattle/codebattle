// assets/js/monaco.setup.ts

import CssWorker from './monaco-workers/css.worker?worker&inline';
import EditorWorker from './monaco-workers/editor.worker?worker&inline';
import HtmlWorker from './monaco-workers/html.worker?worker&inline';
import JsonWorker from './monaco-workers/json.worker?worker&inline';
import TsWorker from './monaco-workers/ts.worker?worker&inline';

const monacoGlobal = self as typeof self & { _VSCODE_FILE_ROOT?: string };
type ViteWorker = new (options?: WorkerOptions) => Worker;

function createWorker(WorkerClass: ViteWorker, developmentPath: string) {
  if (!import.meta.env.DEV) {
    return new WorkerClass();
  }

  // The Phoenix page and Vite dev server use different origins (ports 4000 and 8080).
  // Vite 8 does not inline `?worker&inline` during development, so its generated
  // Worker constructor points at a cross-origin URL and the browser rejects it.
  // Start a same-origin blob worker and let that module import the Vite-served worker.
  const workerUrl = new URL(developmentPath, import.meta.url).href;
  const blob = new Blob(
    [`import ${JSON.stringify(workerUrl)};\nURL.revokeObjectURL(import.meta.url);`],
    {
      type: 'text/javascript',
    },
  );

  return new Worker(URL.createObjectURL(blob), { type: 'module' });
}

// Monaco ESM falls back to FileAccess.asBrowserUri(...), which requires this root.
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-restricted-globals, no-underscore-dangle
  monacoGlobal._VSCODE_FILE_ROOT = `${window.location.origin}/node_modules/monaco-editor/esm/`;
}

// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case 'json':
        return createWorker(JsonWorker, './monaco-workers/json.worker.ts');
      case 'css':
      case 'scss':
      case 'less':
        return createWorker(CssWorker, './monaco-workers/css.worker.ts');
      case 'html':
        return createWorker(HtmlWorker, './monaco-workers/html.worker.ts');
      case 'typescript':
      case 'javascript':
        return createWorker(TsWorker, './monaco-workers/ts.worker.ts');
      default:
        return createWorker(EditorWorker, './monaco-workers/editor.worker.ts');
    }
  },
};
