// assets/js/monaco.setup.js

import CssWorker from './monaco-workers/css.worker?worker&inline';
import EditorWorker from './monaco-workers/editor.worker?worker&inline';
import HtmlWorker from './monaco-workers/html.worker?worker&inline';
import JsonWorker from './monaco-workers/json.worker?worker&inline';
import TsWorker from './monaco-workers/ts.worker?worker&inline';

// Monaco ESM falls back to FileAccess.asBrowserUri(...), which requires this root.
if (import.meta.env.DEV) {
  // eslint-disable-next-line no-restricted-globals, no-underscore-dangle
  self._VSCODE_FILE_ROOT = `${window.location.origin}/node_modules/monaco-editor/esm/`;
}

// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};
