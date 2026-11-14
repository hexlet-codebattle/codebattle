// Go completions, parameter hints and hovers from ./analysis, for editors attached by CodeEditor.
import type * as Monaco from 'monaco-editor';

import { afterAccessor, basicSuggestions, languageServerModels } from '../completions';
import { monaco } from '../monaco';
import { useEditorPrefs } from '../prefs';
import { Analysis, builtins, type Member, packageMembers, type Signature, typeToString } from './analysis';
import { BASIC_TYPES, PACKAGES } from './library';

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

const SNIPPETS = [
  { label: 'for i := 0; i < n; i++', filter: 'for', insert: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t$0\n}', detail: 'Counting loop' },
  { label: 'for i, v := range xs', filter: 'for', insert: 'for ${1:i}, ${2:v} := range ${3:xs} {\n\t$0\n}', detail: 'Range loop' },
  { label: 'if err != nil', filter: 'iferr', insert: 'if err != nil {\n\t$0\n}', detail: 'Error check' },
  { label: 'sort.Slice', filter: 'sort', insert: 'sort.Slice(${1:xs}, func(i, j int) bool { return ${1:xs}[i] < ${1:xs}[j] })', detail: 'Sort by a less function' },
];

const ORDER = { variable: '0', function: '1', library: '2', type: '3', snippet: '4' };

const doc = (text?: string) => (text ? { value: text } : undefined);

/** A result type for display: `elem($0)` → E, `$0` → T, no `void`. */
const shown = (returns: string) => (returns === 'void' ? '' : returns.replace(/elem\(\$\d\)/g, 'E').replace(/\$\d/g, 'T'));

function signatureDoc(signatures: Signature[]) {
  const lines = signatures.map((signature) => `func ${signature.label} ${shown(signature.returns)}`.trim());
  const summary = signatures.find((signature) => signature.doc)?.doc;
  return { value: `\`\`\`go\n${lines.join('\n')}\n\`\`\`${summary ? `\n\n${summary}` : ''}` };
}

function memberItems(members: Member[], range: Monaco.IRange): Monaco.languages.CompletionItem[] {
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
  return members.map((member) => {
    if (!member.signatures.length) {
      const kind = member.kind === 'field' ? CompletionItemKind.Field : member.kind === 'type' ? CompletionItemKind.Class : CompletionItemKind.Constant;
      return { label: member.name, kind, detail: typeToString(member.type), documentation: doc(member.doc), insertText: member.name, range, sortText: ORDER.library };
    }
    const takesArguments = member.signatures[0].params.length > 0;
    return {
      label: member.name,
      kind: member.kind === 'func' ? CompletionItemKind.Function : CompletionItemKind.Method,
      detail: `${member.signatures[0].label} ${shown(member.signatures[0].returns)}`.trim(),
      documentation: signatureDoc(member.signatures),
      insertText: takesArguments ? `${member.name}($0)` : `${member.name}()`,
      insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
      command: takesArguments ? { id: 'editor.action.triggerParameterHints', title: '' } : undefined,
      range,
      sortText: ORDER.library,
    };
  });
}

/** `strings.` lists the package; `x.` the fields and methods of x's type. */
function receiverMembers(analysis: Analysis, before: ReturnType<Analysis['tokensBefore']>, offset: number) {
  const expression = analysis.expressionBefore(before);
  if (expression.length === 1 && analysis.isPackage(expression[0].text, offset)) return packageMembers(expression[0].text);
  const receiver = analysis.evaluate(expression, offset);
  return receiver ? analysis.members(receiver) : undefined;
}

function callAt(analysis: Analysis, offset: number) {
  const tokens = analysis.tokens.filter((token) => token.end <= offset && token.kind !== 'nl');
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
      let signatures: Signature[] | undefined;
      if (tokens[i - 2]?.text === '.') {
        signatures = receiverMembers(analysis, tokens.slice(0, i - 2), offset)?.find((member) => member.name === name.text)?.signatures;
      } else {
        const user = analysis.functions.get(name.text);
        signatures = user ? [{ name: user.name, params: user.params, returns: typeToString(user.returns), label: `${user.name}(${user.params.join(', ')})` }] : builtins().get(name.text);
      }
      return signatures?.length ? { signatures, argument: commas } : undefined;
    } else if (text === ',' && depth === 0) commas++;
  }
  return undefined;
}

let registered = false;

function register() {
  if (registered) return;
  registered = true;
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

  monaco.languages.registerCompletionItemProvider('go', {
    triggerCharacters: ['.'],
    async provideCompletionItems(model, position) {
      if (!attached.has(model)) return undefined;
      if (!useEditorPrefs.getState().autocomplete) return { suggestions: [] };
      const analysis = analyze(model);
      const offset = model.getOffsetAt(position);
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const tokens = analysis.tokensBefore(offset);
      const last = tokens.at(-1);

      if (last?.text === '.') {
        const members = receiverMembers(analysis, tokens.slice(0, -1), offset);
        return { suggestions: members?.length ? memberItems(members, range) : await basicSuggestions(monaco, 'go', model, position, { keywords: false }) };
      }

      const suggestions: Monaco.languages.CompletionItem[] = [];
      const names = new Set<string>();
      for (const variable of analysis.visibleVariables(offset)) {
        if (variable.name === word.word) continue;
        names.add(variable.name);
        suggestions.push({ label: variable.name, kind: CompletionItemKind.Variable, detail: typeToString(analysis.resolve(variable.value, variable.at)), insertText: variable.name, range, sortText: ORDER.variable });
      }
      for (const fn of analysis.functions.values()) {
        names.add(fn.name);
        suggestions.push({
          label: fn.name,
          kind: CompletionItemKind.Function,
          detail: `func ${fn.name}(${fn.params.join(', ')}) ${fn.returns ? typeToString(fn.returns) : ''}`.trim(),
          insertText: `${fn.name}($0)`,
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          command: { id: 'editor.action.triggerParameterHints', title: '' },
          range,
          sortText: ORDER.function,
        });
      }
      for (const name of analysis.structs.keys()) {
        names.add(name);
        suggestions.push({ label: name, kind: CompletionItemKind.Struct, insertText: name, range, sortText: ORDER.type });
      }
      for (const [name, signatures] of builtins()) {
        names.add(name);
        suggestions.push(...memberItems([{ name, kind: 'func', type: undefined, signatures, doc: signatures[0].doc }], range));
      }
      for (const name of Object.keys(PACKAGES)) {
        names.add(name);
        suggestions.push({ label: name, kind: CompletionItemKind.Module, detail: 'package', insertText: name, range, sortText: ORDER.library });
      }
      for (const name of BASIC_TYPES) {
        names.add(name);
        suggestions.push({ label: name, kind: CompletionItemKind.Class, insertText: name, range, sortText: ORDER.type });
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
      suggestions.push(...(await basicSuggestions(monaco, 'go', model, position, { keywords: !afterAccessor(model, position), exclude: names })));
      return { suggestions };
    },
  });

  monaco.languages.registerSignatureHelpProvider('go', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    provideSignatureHelp(model, position) {
      if (!attached.has(model) || !useEditorPrefs.getState().autocomplete) return undefined;
      const call = callAt(analyze(model), model.getOffsetAt(position));
      if (!call) return undefined;
      return {
        value: {
          signatures: call.signatures.map((signature) => {
            const label = `${signature.label} ${shown(signature.returns)}`.trim();
            let from = signature.name.length + 1;
            const parameters = signature.params.map((param) => {
              const start = label.indexOf(param, from);
              from = start + param.length;
              return { label: [start, start + param.length] as [number, number] };
            });
            return { label, documentation: doc(signature.doc), parameters };
          }),
          activeSignature: 0,
          activeParameter: call.argument,
        },
        dispose: () => {},
      };
    },
  });

  monaco.languages.registerHoverProvider('go', {
    provideHover(model, position) {
      if (!attached.has(model)) return undefined;
      const word = model.getWordAtPosition(position);
      if (!word) return undefined;
      const analysis = analyze(model);
      const offset = model.getOffsetAt({ lineNumber: position.lineNumber, column: word.startColumn });
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const tokens = analysis.tokensBefore(offset);
      if (tokens.at(-1)?.text === '.' && tokens.at(-1)?.end === offset) {
        const member = receiverMembers(analysis, tokens.slice(0, -1), offset)?.find((candidate) => candidate.name === word.word);
        if (!member) return undefined;
        return { range, contents: [member.signatures.length ? signatureDoc(member.signatures) : { value: `\`\`\`go\n${member.name} ${typeToString(member.type)}\n\`\`\`${member.doc ? `\n\n${member.doc}` : ''}` }] };
      }
      const variable = analysis.variable(word.word, offset + word.word.length);
      if (variable) return { range, contents: [{ value: `\`\`\`go\nvar ${variable.name} ${typeToString(analysis.resolve(variable.value, variable.at))}\n\`\`\`` }] };
      const builtin = builtins().get(word.word);
      if (builtin) return { range, contents: [signatureDoc(builtin)] };
      return undefined;
    },
  });
}

/** Turns the Go helpers on for a model; returns the detach. */
export function attachGo(model: Monaco.editor.ITextModel) {
  register();
  attached.add(model);
  languageServerModels.add(model);
  return () => {
    attached.delete(model);
    languageServerModels.delete(model);
    cache.delete(model);
  };
}
