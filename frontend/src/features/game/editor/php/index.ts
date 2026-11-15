// PHP completions, parameter hints and hovers from ./analysis, for editors attached by CodeEditor.
import type * as Monaco from 'monaco-editor';

import { basicSuggestions, languageServerModels } from '../completions';
import { monaco } from '../monaco';
import { useEditorPrefs } from '../prefs';
import { Analysis, classMembers, libraryFunctions, type Signature } from './analysis';
import { PHP_CLASSES, PHP_CONSTANTS } from './library';

const attached = new WeakSet<Monaco.editor.ITextModel>();
const cache = new WeakMap<Monaco.editor.ITextModel, { version: number; analysis: Analysis }>();

function analyze(model: Monaco.editor.ITextModel) {
  const version = model.getVersionId();
  const cached = cache.get(model);
  if (cached?.version === version) return cached.analysis;
  const analysis = new Analysis(model.getValue());
  cache.set(model, { version, analysis });
  return analysis;
}

// `\$` is a literal `$` in Monaco snippets.
const SNIPPETS = [
  { label: 'foreach ($xs as $x)', filter: 'foreach', insert: 'foreach (\\$${1:xs} as \\$${2:x}) {\n\t$0\n}', detail: 'Loop over the values' },
  { label: 'foreach ($xs as $k => $v)', filter: 'foreach', insert: 'foreach (\\$${1:xs} as \\$${2:k} => \\$${3:v}) {\n\t$0\n}', detail: 'Loop over keys and values' },
  { label: 'for ($i = 0; $i < $n; $i++)', filter: 'for', insert: 'for (\\$${1:i} = 0; \\$${1:i} < ${2:\\$n}; \\$${1:i}++) {\n\t$0\n}', detail: 'Counting loop' },
  { label: 'usort with <=>', filter: 'usort', insert: 'usort(\\$${1:xs}, fn(\\$a, \\$b) => ${2:\\$a <=> \\$b});', detail: 'Sort by a comparator' },
  { label: 'fn($x) => …', filter: 'fn', insert: 'fn(\\$${1:x}) => $0', detail: 'Arrow function' },
  { label: 'function name(…) { … }', filter: 'function', insert: 'function ${1:name}(${2}) {\n\t$0\n}', detail: 'Function' },
];

const ORDER = { variable: '0', function: '1', library: '2', type: '3', snippet: '4' };

const doc = (text?: string) => (text ? { value: text } : undefined);
const returnsText = (returns: string) => (returns ? `: ${returns}` : '');

function signatureDoc(signature: Signature) {
  return { value: `\`\`\`php\n${signature.label}${returnsText(signature.returns)}\n\`\`\`${signature.doc ? `\n\n${signature.doc}` : ''}` };
}

function callItem(signature: Signature, kind: Monaco.languages.CompletionItemKind, range: Monaco.IRange, sortText: string): Monaco.languages.CompletionItem {
  const takesArguments = signature.params.length > 0;
  return {
    label: signature.name,
    kind,
    detail: `${signature.label}${returnsText(signature.returns)}`,
    documentation: signatureDoc(signature),
    insertText: takesArguments ? `${signature.name}($0)` : `${signature.name}()`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    command: takesArguments ? { id: 'editor.action.triggerParameterHints', title: '' } : undefined,
    range,
    sortText,
  };
}

/** The function or method whose argument list holds offset, and which argument it is in. */
function callAt(analysis: Analysis, offset: number) {
  const tokens = analysis.tokensBefore(offset);
  let depth = 0;
  let commas = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const text = tokens[i].text;
    if (text === ')' || text === ']' || text === '}') depth++;
    else if (text === '[' || text === '{') {
      if (depth === 0) return undefined;
      depth--;
    } else if (text === '(') {
      if (depth > 0) {
        depth--;
        continue;
      }
      const name = tokens[i - 1];
      if (name?.kind !== 'id') return undefined;
      let signature: Signature | undefined;
      if (tokens[i - 2]?.text === '->' || tokens[i - 2]?.text === '?->') {
        signature = classMembers(analysis.receiverType(tokens.slice(0, i - 2), offset) ?? '')?.find((member) => member.name === name.text);
      } else if (tokens[i - 2]?.text.toLowerCase() === 'new') {
        signature = classMembers(name.text)?.find((member) => member.name === '__construct');
        if (signature) signature = { ...signature, name: name.text, label: signature.label.replace('__construct', name.text) };
      } else signature = analysis.functionSignature(name.text);
      return signature ? { signature, argument: commas } : undefined;
    } else if (text === ',' && depth === 0) commas++;
  }
  return undefined;
}

let registered = false;

function register() {
  if (registered) return;
  registered = true;
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

  monaco.languages.registerCompletionItemProvider('php', {
    triggerCharacters: ['$', '>'],
    async provideCompletionItems(model, position, context) {
      if (!attached.has(model)) return undefined;
      if (!useEditorPrefs.getState().autocomplete) return { suggestions: [] };
      const analysis = analyze(model);
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const start = model.getOffsetAt({ lineNumber: position.lineNumber, column: word.startColumn });
      const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      const inside = analysis.inside(start);
      const variable = word.word.startsWith('$');
      const member = /\??->$/.test(before);
      // `>` only opens the list after `->`, not in `$a > $b`.
      if (context.triggerCharacter === '>' && !member) return { suggestions: [] };
      if (inside === 'comment' || inside === 'single' || (inside === 'double' && !variable)) return { suggestions: [] };

      const variables = () =>
        analysis
          .visibleVariables(start)
          .filter((candidate) => candidate.name !== word.word)
          .map((candidate) => ({
            label: candidate.name,
            filterText: variable ? candidate.name : candidate.name.slice(1),
            kind: CompletionItemKind.Variable,
            detail: candidate.type,
            insertText: candidate.name,
            range,
            sortText: ORDER.variable,
          }));
      if (variable) return { suggestions: variables() };

      if (member) {
        const members = classMembers(analysis.receiverType(analysis.tokensBefore(start - (before.endsWith('?->') ? 3 : 2)), start) ?? '');
        if (members) return { suggestions: members.filter((candidate) => !candidate.name.startsWith('__')).map((candidate) => callItem(candidate, CompletionItemKind.Method, range, ORDER.library)) };
        return { suggestions: await basicSuggestions(monaco, 'php', model, position, { keywords: false }) };
      }
      if (/::$/.test(before)) return { suggestions: await basicSuggestions(monaco, 'php', model, position, { keywords: false }) };

      const classes = [...Object.keys(PHP_CLASSES), ...analysis.classes];
      const classItems = classes.map((name) => ({
        label: name,
        kind: CompletionItemKind.Class,
        detail: PHP_CLASSES[name]?.doc,
        insertText: name,
        range,
        sortText: ORDER.type,
      }));
      if (/\bnew\s+$/i.test(before)) return { suggestions: classItems };

      const names = new Set<string>(classes);
      const suggestions: Monaco.languages.CompletionItem[] = [...variables(), ...classItems];
      for (const fn of analysis.functions.values()) {
        names.add(fn.name);
        suggestions.push(callItem({ name: fn.name, params: fn.params, returns: fn.returns, label: `${fn.name}(${fn.params.join(', ')})` }, CompletionItemKind.Function, range, ORDER.function));
      }
      for (const signature of libraryFunctions().values()) {
        if (names.has(signature.name)) continue;
        names.add(signature.name);
        suggestions.push(callItem(signature, CompletionItemKind.Function, range, ORDER.library));
      }
      for (const [name, type] of Object.entries(PHP_CONSTANTS)) {
        names.add(name);
        suggestions.push({ label: name, kind: CompletionItemKind.Constant, detail: type, insertText: name, range, sortText: ORDER.library });
      }
      for (const snippet of SNIPPETS) {
        suggestions.push({
          label: snippet.label,
          filterText: snippet.filter,
          kind: CompletionItemKind.Snippet,
          detail: snippet.detail,
          insertText: snippet.insert,
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: ORDER.snippet,
        });
      }
      // The file's `$names` are already listed as variables.
      for (const candidate of analysis.visibleVariables(start)) names.add(candidate.name.slice(1));
      suggestions.push(...(await basicSuggestions(monaco, 'php', model, position, { exclude: names })));
      return { suggestions };
    },
  });

  monaco.languages.registerSignatureHelpProvider('php', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    provideSignatureHelp(model, position) {
      if (!attached.has(model) || !useEditorPrefs.getState().autocomplete) return undefined;
      const call = callAt(analyze(model), model.getOffsetAt(position));
      if (!call) return undefined;
      const { signature } = call;
      const label = `${signature.label}${returnsText(signature.returns)}`;
      let from = signature.name.length + 1;
      const parameters = signature.params.map((param) => {
        const at = label.indexOf(param, from);
        from = at + param.length;
        return { label: [at, at + param.length] as [number, number] };
      });
      const variadic = signature.params.at(-1)?.includes('...');
      const active = variadic ? Math.min(call.argument, signature.params.length - 1) : call.argument;
      return { value: { signatures: [{ label, documentation: doc(signature.doc), parameters }], activeSignature: 0, activeParameter: active }, dispose: () => {} };
    },
  });

  monaco.languages.registerHoverProvider('php', {
    provideHover(model, position) {
      if (!attached.has(model)) return undefined;
      const word = model.getWordAtPosition(position);
      if (!word) return undefined;
      const analysis = analyze(model);
      const start = model.getOffsetAt({ lineNumber: position.lineNumber, column: word.startColumn });
      if (analysis.inside(start + 1)) return undefined;
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      if (word.word.startsWith('$')) {
        const variable = analysis.variable(word.word, start);
        return variable ? { range, contents: [{ value: `\`\`\`php\n${variable.type} ${variable.name}\n\`\`\`` }] } : undefined;
      }
      const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      if (/\??->$/.test(before)) {
        const receiver = analysis.receiverType(analysis.tokensBefore(start - (before.endsWith('?->') ? 3 : 2)), start);
        const member = classMembers(receiver ?? '')?.find((candidate) => candidate.name === word.word);
        return member ? { range, contents: [signatureDoc(member)] } : undefined;
      }
      const signature = analysis.functionSignature(word.word);
      if (signature) return { range, contents: [signatureDoc(signature)] };
      const known = PHP_CLASSES[word.word];
      if (known) return { range, contents: [{ value: `\`\`\`php\nclass ${word.word}\n\`\`\`\n\n${known.doc}` }] };
      const constant = PHP_CONSTANTS[word.word];
      return constant ? { range, contents: [{ value: `\`\`\`php\n${constant} ${word.word}\n\`\`\`` }] } : undefined;
    },
  });
}

/** Turns the PHP helpers on for a model; returns the detach. */
export function attachPhp(model: Monaco.editor.ITextModel) {
  register();
  attached.add(model);
  languageServerModels.add(model);
  return () => {
    attached.delete(model);
    languageServerModels.delete(model);
    cache.delete(model);
  };
}
