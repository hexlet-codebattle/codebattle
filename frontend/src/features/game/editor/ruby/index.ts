// Ruby completions, parameter hints and hovers from ./analysis, for editors attached by
// CodeEditor. The task's input signature types `def solution(...)`'s parameters.
import type * as Monaco from 'monaco-editor';

import type { GameTask } from '../../types';
import { afterAccessor, basicSuggestions, languageServerModels } from '../completions';
import { monaco } from '../monaco';
import { useEditorPrefs } from '../prefs';
import { Analysis, classMethods, constants, kernel, type Member, type Signature, typeToString } from './analysis';
import { CLASS_METHODS, RUBY_CLASSES } from './corelib';

type InputSignature = NonNullable<GameTask['input_signature']>;

const attached = new Map<Monaco.editor.ITextModel, Map<string, string>>();
const cache = new WeakMap<Monaco.editor.ITextModel, { version: number; analysis: Analysis }>();

function analyze(model: Monaco.editor.ITextModel) {
  const version = model.getVersionId();
  const cached = cache.get(model);
  if (cached?.version === version) return cached.analysis;
  const analysis = new Analysis(model.getValue(), attached.get(model));
  cache.set(model, { version, analysis });
  return analysis;
}

/** A task signature type ({ name: 'array', nested: { name: 'integer' } }) as a Ruby type. */
function rubyType(signatureType: unknown): string {
  const { name, nested } = (signatureType ?? {}) as { name?: string; nested?: unknown };
  switch (name) {
    case 'integer':
      return 'Integer';
    case 'float':
      return 'Float';
    case 'string':
      return 'String';
    case 'boolean':
      return 'Boolean';
    case 'array':
      return `Array[${rubyType(nested)}]`;
    case 'hash':
      return `Hash[String, ${rubyType(nested)}]`;
    default:
      return '?';
  }
}

const SNIPPETS: { label: string; filter: string; insert: string; detail: string }[] = [
  { label: 'each do |x| … end', filter: 'each', insert: 'each do |${1:x}|\n\t$0\nend', detail: 'Block over each element' },
  { label: 'each_with_index do |x, i| … end', filter: 'each_with_index', insert: 'each_with_index do |${1:x}, ${2:i}|\n\t$0\nend', detail: 'Block with the index' },
  { label: 'times do |i| … end', filter: 'times', insert: 'times do |${1:i}|\n\t$0\nend', detail: 'Block n times' },
  { label: 'def … end', filter: 'def', insert: 'def ${1:name}(${2:args})\n\t$0\nend', detail: 'Method' },
  { label: 'Hash.new(0)', filter: 'Hash', insert: 'Hash.new(0)', detail: 'Counter hash' },
];

const ORDER = { variable: '0', method: '1', core: '2', type: '3', snippet: '4' };

const doc = (text?: string) => (text ? { value: text } : undefined);

function signatureDoc(signatures: Signature[], owners?: string[]) {
  const lines = signatures.map((signature) => `${signature.label}${signature.block ? ` { |${signature.block.join(', ')}| }` : ''} → ${signature.returns}`);
  const summary = signatures.find((signature) => signature.doc)?.doc;
  return { value: `\`\`\`ruby\n${lines.join('\n')}\n\`\`\`${summary ? `\n\n${summary}` : ''}${owners ? `\n\n${owners.join(', ')}` : ''}` };
}

function methodItem(name: string, signatures: Signature[], range: Monaco.IRange, kind: Monaco.languages.CompletionItemKind, owners?: string[]): Monaco.languages.CompletionItem {
  const { CompletionItemInsertTextRule } = monaco.languages;
  const takesArguments = signatures.every((signature) => signature.params.length > 0);
  const first = signatures[0];
  return {
    label: name,
    kind,
    detail: owners ? owners.join(', ') : `${first.label} → ${first.returns}`,
    documentation: signatureDoc(signatures, owners),
    insertText: takesArguments ? `${name}($0)` : name,
    insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
    command: takesArguments ? { id: 'editor.action.triggerParameterHints', title: '' } : undefined,
    range,
    sortText: ORDER.core,
  };
}

function memberItems(members: Member[], range: Monaco.IRange) {
  return members.map((member) => methodItem(member.name, member.signatures, range, monaco.languages.CompletionItemKind.Method, member.owners));
}

function callAt(analysis: Analysis, offset: number) {
  const tokens = analysis.tokens.filter((token) => token.end <= offset);
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
      if (!name || (name.kind !== 'id' && name.kind !== 'const')) return undefined;
      const connector = tokens[i - 2]?.text;
      let signatures: Signature[] | undefined;
      if (connector === '.' || connector === '&.') {
        const receiverTokens = analysis.expressionBefore(tokens.slice(0, i - 2));
        if (receiverTokens.length === 1 && receiverTokens[0].kind === 'const' && CLASS_METHODS[receiverTokens[0].text]) {
          signatures = classMethods(receiverTokens[0].text).get(name.text);
        } else {
          const receiver = analysis.evaluate(receiverTokens, offset);
          signatures = (receiver ? analysis.members(receiver) : analysis.allMembers()).find((member) => member.name === name.text)?.signatures;
        }
      } else {
        const own = analysis.methods.get(name.text);
        signatures = own ? [{ name: own.name, params: own.params, returns: '?', label: `${own.name}(${own.params.join(', ')})` }] : kernel().get(name.text);
      }
      const withParams = signatures?.filter((signature) => signature.params.length);
      return withParams?.length ? { signatures: withParams, argument: commas } : undefined;
    } else if (text === ',' && depth === 0) commas++;
    else if (tokens[i].kind === 'nl' && depth === 0) return undefined;
  }
  return undefined;
}

let registered = false;

function register() {
  if (registered) return;
  registered = true;
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

  monaco.languages.registerCompletionItemProvider('ruby', {
    triggerCharacters: ['.', ':'],
    async provideCompletionItems(model, position) {
      if (!attached.has(model)) return undefined;
      if (!useEditorPrefs.getState().autocomplete) return { suggestions: [] };
      const analysis = analyze(model);
      const offset = model.getOffsetAt(position);
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const tokens = analysis.tokensBefore(offset);
      const last = tokens.at(-1);

      if (last && (last.text === '.' || last.text === '&.') && last.end === offset - word.word.length) {
        const receiverTokens = analysis.expressionBefore(tokens.slice(0, -1));
        if (receiverTokens.length === 1 && receiverTokens[0].kind === 'const' && CLASS_METHODS[receiverTokens[0].text]) {
          return { suggestions: [...classMethods(receiverTokens[0].text)].map(([name, signatures]) => methodItem(name, signatures, range, CompletionItemKind.Method)) };
        }
        const receiver = analysis.evaluate(receiverTokens, offset);
        // Unknown receiver: every core method, with the classes that have it.
        return { suggestions: memberItems(receiver ? analysis.members(receiver) : analysis.allMembers(), range) };
      }
      if (last?.text === '::') {
        const owner = tokens.at(-2)?.text ?? '';
        return { suggestions: constants(owner).map((constant) => ({ label: constant.name, kind: CompletionItemKind.Constant, detail: constant.returns, documentation: doc(constant.doc), insertText: constant.name, range })) };
      }
      const typed = model.getValueInRange({ ...range, startColumn: Math.max(1, range.startColumn - 1), endColumn: range.startColumn });
      if (!word.word && typed === ':') return { suggestions: [] };

      const suggestions: Monaco.languages.CompletionItem[] = [];
      const names = new Set<string>();
      for (const variable of analysis.visibleVariables(offset)) {
        if (variable.name === word.word) continue;
        names.add(variable.name);
        suggestions.push({
          label: variable.name,
          kind: CompletionItemKind.Variable,
          detail: typeToString(analysis.resolve(variable.value, variable.at)),
          insertText: variable.name,
          range,
          sortText: ORDER.variable,
        });
      }
      for (const method of analysis.methods.values()) {
        names.add(method.name);
        suggestions.push({ label: method.name, kind: CompletionItemKind.Function, detail: `${method.name}(${method.params.join(', ')})`, insertText: method.name, range, sortText: ORDER.method });
      }
      for (const [name, signatures] of kernel()) {
        names.add(name);
        suggestions.push(methodItem(name, signatures, range, CompletionItemKind.Function));
      }
      for (const name of new Set([...Object.keys(RUBY_CLASSES), ...Object.keys(CLASS_METHODS)])) {
        if (name === 'Tuple') continue;
        names.add(name);
        suggestions.push({ label: name, kind: CompletionItemKind.Class, detail: RUBY_CLASSES[name]?.doc, insertText: name, range, sortText: ORDER.type });
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
      suggestions.push(...(await basicSuggestions(monaco, 'ruby', model, position, { keywords: !afterAccessor(model, position), exclude: names })));
      return { suggestions };
    },
  });

  monaco.languages.registerSignatureHelpProvider('ruby', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [')'],
    provideSignatureHelp(model, position) {
      if (!attached.has(model) || !useEditorPrefs.getState().autocomplete) return undefined;
      const call = callAt(analyze(model), model.getOffsetAt(position));
      if (!call) return undefined;
      const fitting = call.signatures.findIndex((signature) => signature.params.length > call.argument);
      return {
        value: {
          signatures: call.signatures.map((signature) => {
            const label = `${signature.label} → ${signature.returns}`;
            let from = signature.name.length + 1;
            const parameters = signature.params.map((param) => {
              const start = label.indexOf(param, from);
              from = start + param.length;
              return { label: [start, start + param.length] as [number, number] };
            });
            return { label, documentation: doc(signature.doc), parameters };
          }),
          activeSignature: Math.max(0, fitting),
          activeParameter: call.argument,
        },
        dispose: () => {},
      };
    },
  });

  monaco.languages.registerHoverProvider('ruby', {
    provideHover(model, position) {
      if (!attached.has(model)) return undefined;
      const word = model.getWordAtPosition(position);
      if (!word) return undefined;
      const analysis = analyze(model);
      const offset = model.getOffsetAt({ lineNumber: position.lineNumber, column: word.startColumn });
      const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
      const tokens = analysis.tokensBefore(offset);
      const last = tokens.at(-1);
      if (last?.end === offset && (last.text === '.' || last.text === '&.')) {
        const receiver = analysis.evaluate(analysis.expressionBefore(tokens.slice(0, -1)), offset);
        const member = (receiver ? analysis.members(receiver) : analysis.allMembers()).find((candidate) => candidate.name === word.word);
        return member ? { range, contents: [signatureDoc(member.signatures, member.owners)] } : undefined;
      }
      const variable = analysis.variable(word.word, offset + word.word.length);
      if (variable) return { range, contents: [{ value: `\`\`\`ruby\n${variable.name}: ${typeToString(analysis.resolve(variable.value, variable.at))}\n\`\`\`` }] };
      const signatures = kernel().get(word.word);
      if (signatures) return { range, contents: [signatureDoc(signatures)] };
      const rubyClass = RUBY_CLASSES[word.word];
      if (rubyClass) return { range, contents: [{ value: `\`\`\`ruby\n${word.word}\n\`\`\`\n\n${rubyClass.doc}` }] };
      return undefined;
    },
  });
}

/** Turns the Ruby helpers on for a model; returns the detach. */
export function attachRuby(model: Monaco.editor.ITextModel, signature: InputSignature = []) {
  register();
  attached.set(model, new Map(signature.map(({ argument_name: name, type }) => [name, rubyType(type)])));
  cache.delete(model);
  languageServerModels.add(model);
  return () => {
    attached.delete(model);
    languageServerModels.delete(model);
    cache.delete(model);
  };
}
