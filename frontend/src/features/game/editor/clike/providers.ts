// Completions, parameter hints and hovers from ./analysis for a C-like language (C++, Java),
// for the editors CodeEditor attaches.
import type * as Monaco from 'monaco-editor';

import { afterAccessor, basicSuggestions, languageServerModels } from '../completions';
import { monaco } from '../monaco';
import { useEditorPrefs } from '../prefs';
import { Analysis, functionSignatures, libraryValues, type Member, type Profile, returnText, type Signature, typeToString } from './analysis';

export interface Snippet {
  label: string;
  filter: string;
  insert: string;
  detail: string;
}

export interface Language {
  /** Monaco's language id. */
  id: string;
  profile: Profile;
  snippets: Snippet[];
  /** Types to suggest besides the profile's (C++'s size_t, …). */
  plainTypes?: string[];
  /** Fence language for hovers. */
  fence: string;
  /** Keywords instead of the Monaco grammar's (D borrows C++'s grammar). */
  keywords?: string[];
}

// Sort groups: the file's names first, then members/library, snippets, keywords and words.
const ORDER = { variable: '0', function: '1', library: '2', type: '3', snippet: '4' };

const doc = (text?: string) => (text ? { value: text } : undefined);

export function attachTo(language: Language) {
  const attached = new WeakSet<Monaco.editor.ITextModel>();
  const cache = new WeakMap<Monaco.editor.ITextModel, { version: number; analysis: Analysis }>();
  const { profile, fence } = language;

  const analyze = (model: Monaco.editor.ITextModel) => {
    const version = model.getVersionId();
    const cached = cache.get(model);
    if (cached?.version === version) return cached.analysis;
    const analysis = new Analysis(model.getValue(), profile);
    cache.set(model, { version, analysis });
    return analysis;
  };

  const signatureDoc = (signatures: Signature[]) => {
    const lines = signatures.map((signature) => `${signature.label}: ${returnText(signature)}`);
    const summary = signatures.find((signature) => signature.doc)?.doc;
    return { value: `\`\`\`${fence}\n${lines.join('\n')}\n\`\`\`${summary ? `\n\n${summary}` : ''}` };
  };

  const memberItems = (members: Member[], range: Monaco.IRange): Monaco.languages.CompletionItem[] => {
    const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
    return members.map((member) => {
      if (member.kind === 'field') {
        return { label: member.name, kind: CompletionItemKind.Field, detail: typeToString(member.type), documentation: doc(member.doc), insertText: member.name, range, sortText: ORDER.library };
      }
      const takesArguments = member.signatures.some((signature) => signature.params.length > 0);
      return {
        label: member.name,
        kind: CompletionItemKind.Method,
        detail: member.signatures.length > 1 ? `${member.signatures[0].label} (+${member.signatures.length - 1})` : member.signatures[0]?.label,
        documentation: signatureDoc(member.signatures),
        insertText: takesArguments ? `${member.name}($0)` : profile.optionalParens ? member.name : `${member.name}()`,
        insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        command: takesArguments ? { id: 'editor.action.triggerParameterHints', title: '' } : undefined,
        range,
        sortText: ORDER.library,
      };
    });
  };

  /** Library types, free functions, values and classes with static members. */
  const libraryItems = (range: Monaco.IRange): Monaco.languages.CompletionItem[] => {
    const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
    const items: Monaco.languages.CompletionItem[] = [];
    const seen = new Set<string>();
    for (const [name, std] of Object.entries(profile.types)) {
      if (name === 'iterator') continue;
      seen.add(name);
      items.push({ label: name, kind: CompletionItemKind.Class, detail: std.doc, insertText: name, range, sortText: ORDER.type });
    }
    for (const name of [...(language.plainTypes ?? []), ...Object.keys(profile.statics)]) {
      if (seen.has(name)) continue;
      seen.add(name);
      items.push({ label: name, kind: CompletionItemKind.Class, insertText: name, range, sortText: ORDER.type });
    }
    for (const [name, signatures] of functionSignatures(profile)) {
      items.push({
        label: name,
        kind: CompletionItemKind.Function,
        detail: signatures.length > 1 ? `${signatures[0].label} (+${signatures.length - 1})` : signatures[0].label,
        documentation: signatureDoc(signatures),
        insertText: `${name}($0)`,
        insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        command: { id: 'editor.action.triggerParameterHints', title: '' },
        range,
        sortText: ORDER.library,
      });
    }
    for (const [name, value] of libraryValues(profile)) {
      items.push({ label: name, kind: CompletionItemKind.Constant, detail: value.returns, documentation: doc(value.doc), insertText: name, range, sortText: ORDER.library });
    }
    return items;
  };

  /** What `x.` / `x->` completes: static members of a class name, or the members of x's type. */
  const receiverMembers = (analysis: Analysis, before: ReturnType<Analysis['tokensBefore']>, connector: string, offset: number) => {
    const expression = analysis.expressionBefore(before);
    if (connector === '.' && expression.length === 1 && profile.statics[expression[0].text] && !analysis.variable(expression[0].text, offset)) {
      return analysis.staticMembers(expression[0].text);
    }
    let receiver = analysis.evaluate(expression, offset);
    if (connector === '->') receiver = receiver && analysis.derefOf(receiver);
    return receiver ? analysis.members(receiver) : undefined;
  };

  /** The signatures of the call whose parentheses hold `offset`, and the argument there. */
  const callAt = (analysis: Analysis, offset: number) => {
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
        if (name?.kind !== 'id') return undefined;
        const connector = tokens[i - 2]?.text;
        let signatures: Signature[] | undefined;
        if (connector === '.' || (connector === '->' && profile.arrowMember)) {
          signatures = receiverMembers(analysis, tokens.slice(0, i - 2), connector, offset)?.find((member) => member.name === name.text)?.signatures;
        } else {
          const user = analysis.functions.get(name.text);
          signatures = user
            ? [{ name: user.name, params: user.params, returns: user.returns, label: `${user.name}(${user.params.join(', ')})` }]
            : functionSignatures(profile).get(name.text);
        }
        return signatures?.length ? { signatures, argument: commas } : undefined;
      } else if (text === ',' && depth === 0) commas++;
      else if (text === ';' && depth === 0) return undefined;
    }
    return undefined;
  };

  const register = () => {
    const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;

    monaco.languages.registerCompletionItemProvider(language.id, {
      triggerCharacters: profile.arrowMember ? ['.', '>', ':'] : ['.'],
      async provideCompletionItems(model, position) {
        if (!attached.has(model)) return undefined;
        if (!useEditorPrefs.getState().autocomplete) return { suggestions: [] };
        const analysis = analyze(model);
        const offset = model.getOffsetAt(position);
        const word = model.getWordUntilPosition(position);
        const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
        const tokens = analysis.tokensBefore(offset);
        const last = tokens.at(-1);

        if (last && (last.text === '.' || (last.text === '->' && profile.arrowMember))) {
          const members = receiverMembers(analysis, tokens.slice(0, -1), last.text, offset);
          // Unknown type: the file's words are still a fair guess.
          return { suggestions: members?.length ? memberItems(members, range) : await basicSuggestions(monaco, language.id, model, position, { keywords: false }) };
        }
        if (last?.text === '::') return { suggestions: profile.namespace && tokens.at(-2)?.text === profile.namespace ? libraryItems(range) : [] };
        // `>` and `:` only matter as the end of `->` and `::`.
        const typed = model.getValueInRange({ ...range, startColumn: Math.max(1, range.startColumn - 1), endColumn: range.startColumn });
        if (!word.word && (typed === '>' || typed === ':')) return { suggestions: [] };

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
        for (const fn of analysis.functions.values()) {
          names.add(fn.name);
          suggestions.push({
            label: fn.name,
            kind: CompletionItemKind.Function,
            detail: `${fn.name}(${fn.params.join(', ')}): ${typeToString(fn.returns)}`,
            insertText: `${fn.name}($0)`,
            insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
            command: { id: 'editor.action.triggerParameterHints', title: '' },
            range,
            sortText: ORDER.function,
          });
        }
        for (const struct of analysis.structs.keys()) {
          names.add(struct);
          suggestions.push({ label: struct, kind: CompletionItemKind.Struct, insertText: struct, range, sortText: ORDER.type });
        }
        for (const item of libraryItems(range)) {
          names.add(item.label as string);
          suggestions.push(item);
        }
        for (const snippet of language.snippets) {
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
        const keywords = !afterAccessor(model, position);
        if (language.keywords && keywords) {
          for (const keyword of language.keywords) {
            if (!names.has(keyword)) suggestions.push({ label: keyword, kind: CompletionItemKind.Keyword, insertText: keyword, range });
            names.add(keyword);
          }
        }
        suggestions.push(...(await basicSuggestions(monaco, language.id, model, position, { keywords: keywords && !language.keywords, exclude: names })));
        return { suggestions };
      },
    });

    monaco.languages.registerSignatureHelpProvider(language.id, {
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
              const label = `${signature.label}: ${returnText(signature)}`;
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

    monaco.languages.registerHoverProvider(language.id, {
      provideHover(model, position) {
        if (!attached.has(model)) return undefined;
        const word = model.getWordAtPosition(position);
        if (!word) return undefined;
        const analysis = analyze(model);
        const offset = model.getOffsetAt({ lineNumber: position.lineNumber, column: word.startColumn });
        const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
        const tokens = analysis.tokensBefore(offset);
        const last = tokens.at(-1);
        if (last?.end === offset && (last.text === '.' || (last.text === '->' && profile.arrowMember))) {
          const member = receiverMembers(analysis, tokens.slice(0, -1), last.text, offset)?.find((candidate) => candidate.name === word.word);
          if (!member) return undefined;
          const contents =
            member.kind === 'field' ? { value: `\`\`\`${fence}\n${typeToString(member.type)} ${member.name}\n\`\`\`${member.doc ? `\n\n${member.doc}` : ''}` } : signatureDoc(member.signatures);
          return { range, contents: [contents] };
        }
        const variable = analysis.variable(word.word, offset + word.word.length);
        if (variable) {
          return { range, contents: [{ value: `\`\`\`${fence}\n${typeToString(analysis.resolve(variable.value, variable.at))} ${variable.name}\n\`\`\`` }] };
        }
        const user = analysis.functions.get(word.word);
        if (user) return { range, contents: [{ value: `\`\`\`${fence}\n${typeToString(user.returns)} ${user.name}(${user.params.join(', ')})\n\`\`\`` }] };
        const signatures = functionSignatures(profile).get(word.word);
        if (signatures) return { range, contents: [signatureDoc(signatures)] };
        const std = profile.types[word.word];
        if (std) return { range, contents: [{ value: `\`\`\`${fence}\n${profile.namespace ? `${profile.namespace}::` : ''}${word.word}\n\`\`\`\n\n${std.doc}` }] };
        return undefined;
      },
    });
  };

  let registered = false;
  /** Turns the helpers on for a model; returns the detach. */
  return (model: Monaco.editor.ITextModel) => {
    if (!registered) {
      registered = true;
      register();
    }
    attached.add(model);
    languageServerModels.add(model);
    return () => {
      attached.delete(model);
      languageServerModels.delete(model);
      cache.delete(model);
    };
  };
}
