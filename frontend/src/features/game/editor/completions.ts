// Autocomplete for languages Monaco has no language service for (everything but JS/TS/CSS):
// the keywords and builtins from Monaco's own Monarch grammar plus the identifiers already in the
// file. Monaco's word-based suggestions only show when no provider answers, so the file's words
// are offered here too.
import type * as Monaco from 'monaco-editor';

import zig from './languages/zig';
import { useEditorPrefs } from './prefs';

type Grammar = Record<string, unknown>;
type LanguageDef = Monaco.languages.ILanguageExtensionPoint & { loader?: () => Promise<{ language?: Grammar }> };

/** Monaco ids that get this provider (JS/TS and CSS have real language services). */
const LANGUAGES = [
  'clojure',
  'cpp',
  'csharp',
  'dart',
  'elixir',
  'go',
  'java',
  'kotlin',
  'php',
  'python',
  'ruby',
  'rust',
  'swift',
  'zig',
  'pgsql',
  'mysql',
];

/** Grammar lists that aren't words a user types. */
const SKIPPED_LISTS = new Set(['brackets', 'operators', 'keywordops', 'autoClosingPairs', 'surroundingPairs']);
/** Grammar lists of functions and macros (the rest are keywords, types and constants). */
const FUNCTION_LIST = /builtin|core|macro|function/i;
// No compiler-internal `__names` (the C++ grammar lists MSVC's `__raise`, `__resume`, …).
const WORD = /^(?!__)[A-Za-z_][\w]*[!?]?$/;
const IDENTIFIER = /[A-Za-z_]\w{2,}/g;
const MAX_DOCUMENT_WORDS = 2000;

interface GrammarWord {
  word: string;
  isFunction: boolean;
}

const grammarWords = new Map<string, Promise<GrammarWord[]>>();

/** Models a language server answers for (see ./pythonLsp): no keyword list on top of it. */
export const languageServerModels = new WeakSet<Monaco.editor.ITextModel>();

function collectWords(grammar: Grammar): GrammarWord[] {
  const words = new Map<string, GrammarWord>();
  for (const [list, value] of Object.entries(grammar)) {
    if (SKIPPED_LISTS.has(list) || !Array.isArray(value)) continue;
    for (const word of value) {
      if (typeof word === 'string' && word.length > 1 && WORD.test(word) && !words.has(word)) {
        words.set(word, { word, isFunction: FUNCTION_LIST.test(list) });
      }
    }
  }
  return [...words.values()];
}

function loadGrammarWords(monaco: typeof Monaco, languageId: string) {
  let words = grammarWords.get(languageId);
  if (!words) {
    const def = monaco.languages.getLanguages().find(({ id }) => id === languageId) as LanguageDef | undefined;
    const grammar = languageId === 'zig' ? Promise.resolve(zig as Grammar) : def?.loader?.().then((mod) => mod.language);
    words = (grammar ?? Promise.resolve(undefined)).then((language) => (language ? collectWords(language) : [])).catch(() => []);
    grammarWords.set(languageId, words);
  }
  return words;
}

function documentWords(model: Monaco.editor.ITextModel, typed: string) {
  const words = new Set<string>();
  for (const [word] of model.getValue().matchAll(IDENTIFIER)) {
    if (word !== typed) words.add(word);
    if (words.size >= MAX_DOCUMENT_WORDS) break;
  }
  return words;
}

export function registerCompletions(monaco: typeof Monaco) {
  const { CompletionItemKind } = monaco.languages;

  for (const languageId of LANGUAGES) {
    monaco.languages.registerCompletionItemProvider(languageId, {
      async provideCompletionItems(model, position) {
        if (!useEditorPrefs.getState().autocomplete || languageServerModels.has(model)) return { suggestions: [] };

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const builtins = await loadGrammarWords(monaco, languageId);
        const known = new Set(builtins.map(({ word: builtin }) => builtin));

        const suggestions: Monaco.languages.CompletionItem[] = builtins.map(({ word: builtin, isFunction }) => ({
          label: builtin,
          kind: isFunction ? CompletionItemKind.Function : CompletionItemKind.Keyword,
          insertText: builtin,
          range,
        }));
        for (const identifier of documentWords(model, word.word)) {
          if (!known.has(identifier)) {
            suggestions.push({ label: identifier, kind: CompletionItemKind.Text, insertText: identifier, range });
          }
        }
        return { suggestions };
      },
    });
  }
}
