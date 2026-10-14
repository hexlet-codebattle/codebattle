// Monaco setup for the game editors: local ESM build (no CDN), bundled workers, Zig grammar.
// Import this module before rendering @monaco-editor/react.
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import zig from './languages/zig';
import { defineThemes } from './themes';
import CssWorker from './workers/css.worker?worker';
import EditorWorker from './workers/editor.worker?worker';
import TsWorker from './workers/ts.worker?worker';

type ViteWorker = new (options?: WorkerOptions) => Worker;

function createWorker(WorkerClass: ViteWorker, developmentPath: string) {
  if (!import.meta.env.DEV) return new WorkerClass();

  // Phoenix (:4000) and Vite (:8081) are different origins and Vite does not inline
  // workers in dev, so start a same-origin blob worker that imports the Vite-served one.
  const workerUrl = new URL(developmentPath, import.meta.url).href;
  const blob = new Blob([`import ${JSON.stringify(workerUrl)};\nURL.revokeObjectURL(import.meta.url);`], {
    type: 'text/javascript',
  });

  return new Worker(URL.createObjectURL(blob), { type: 'module' });
}

const monacoGlobal = self as typeof self & { _VSCODE_FILE_ROOT?: string };

// Monaco ESM resolves some files through FileAccess.asBrowserUri, which needs this root.
if (import.meta.env.DEV) {
  monacoGlobal._VSCODE_FILE_ROOT = new URL('/node_modules/monaco-editor/esm/', import.meta.url).href;
}

self.MonacoEnvironment = {
  getWorker(_, label) {
    switch (label) {
      case 'css':
      case 'scss':
      case 'less':
        return createWorker(CssWorker, './workers/css.worker.ts');
      case 'typescript':
      case 'javascript':
        return createWorker(TsWorker, './workers/ts.worker.ts');
      default:
        return createWorker(EditorWorker, './workers/editor.worker.ts');
    }
  },
};

loader.config({ monaco });

monaco.languages.register({ id: 'zig', aliases: ['zig'] });
monaco.languages.setMonarchTokensProvider('zig', zig as monaco.languages.IMonarchLanguage);

defineThemes(monaco.editor);

// Monaco measures glyphs on mount; re-measure once the webfont (Source Code Pro) is in,
// or the cursor and selections drift off the characters.
void document.fonts?.ready.then(() => monaco.editor.remeasureFonts());

/** Codebattle language slug → Monaco language id (legacy config/languages.ts). */
const MONACO_LANGUAGES: Record<string, string> = {
  clojure: 'clojure',
  cpp: 'cpp',
  csharp: 'csharp',
  dart: 'dart',
  // Monaco has no D grammar; C++ highlighting fits well enough.
  dlang: 'cpp',
  elixir: 'elixir',
  golang: 'go',
  java: 'java',
  js: 'javascript',
  kotlin: 'kotlin',
  php: 'php',
  python: 'python',
  ruby: 'ruby',
  rust: 'rust',
  swift: 'swift',
  ts: 'typescript',
  zig: 'zig',
  // CSS and SQL battles.
  css: 'css',
  less: 'less',
  sass: 'scss',
  stylus: 'plaintext',
  postgresql: 'pgsql',
  mysql: 'mysql',
  mongodb: 'javascript',
};

export const monacoLanguage = (slug: string) => MONACO_LANGUAGES[slug] ?? 'plaintext';

/** Indent width per language (legacy config/languageTabSizes.ts). */
const TAB_SIZES: Record<string, number> = { csharp: 4, golang: 4, java: 4, kotlin: 4, dlang: 4 };

export const tabSize = (slug: string) => TAB_SIZES[slug] ?? 2;
/** Go keeps real tabs; everything else indents with spaces. */
export const insertSpaces = (slug: string) => slug !== 'golang';

export { monaco };
