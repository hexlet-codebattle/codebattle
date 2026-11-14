// A small Ruby analyser for battle solutions: types from literals, from the task signature
// (`def solution(nums, k)` with nums an Array[Integer]), from assignments, block parameters
// (`nums.each_with_index { |x, i| }`) and one-line block results (`map { |x| x * 2 }`), so that
// `x.` lists the right core methods (./corelib). No scopes beyond "the nearest assignment
// before the cursor". No Monaco here.

import { CLASS_METHODS, CONSTANTS, KERNEL, RUBY_CLASSES } from './corelib';

export interface Type {
  name: string;
  args: Type[];
}

export interface Signature {
  name: string;
  params: string[];
  returns: string;
  block?: string[];
  doc?: string;
  label: string;
}

export interface Member {
  name: string;
  type: Type | undefined;
  signatures: Signature[];
  doc?: string;
  /** Classes that have it, when listed for an unknown receiver. */
  owners?: string[];
}

export interface Token {
  text: string;
  kind: 'id' | 'const' | 'num' | 'str' | 'sym' | 'words' | 'regex' | 'punct' | 'nl';
  start: number;
  end: number;
}

export const type = (name: string, args: Type[] = []): Type => ({ name, args });
const UNKNOWN = type('?');

export function typeToString(t: Type | undefined): string {
  if (!t) return '?';
  return t.args.length ? `${t.name}[${t.args.map(typeToString).join(', ')}]` : t.name;
}

// ---------------------------------------------------------------------------------------------
// Tokens

const PUNCTUATION = ['**=', '<=>', '===', '...', '||=', '&&=', '&.', '::', '..', '**', '<<', '>>', '==', '!=', '=~', '<=', '>=', '=>', '->', '||', '&&', '+=', '-=', '*=', '/=', '%='];
const KEYWORDS = new Set(['if', 'unless', 'while', 'until', 'return', 'and', 'or', 'not', 'then', 'else', 'elsif', 'when', 'case', 'in', 'do', 'puts', 'print', 'p']);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;
  // A `/` or `:` that can start a literal: at the start or after an operator.
  const valueExpected = () => {
    const last = tokens.at(-1);
    return !last || last.kind === 'nl' || (last.kind === 'punct' && !')]}'.includes(last.text)) || (last.kind === 'id' && KEYWORDS.has(last.text));
  };
  while (i < n) {
    const c = source[i];
    const start = i;
    if (c === '\n') {
      if (tokens.at(-1)?.kind !== 'nl') tokens.push({ text: '\n', kind: 'nl', start, end: i + 1 });
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '\\' && source[i + 1] === '\n') {
      i += 2;
      continue;
    }
    if (c === '#') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (source.startsWith('=begin', i) && (i === 0 || source[i - 1] === '\n')) {
      const end = source.indexOf('\n=end', i);
      i = end < 0 ? n : end + 5;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < n && source[i] !== c) i += source[i] === '\\' ? 2 : 1;
      i++;
      tokens.push({ text: source.slice(start, Math.min(i, n)), kind: 'str', start, end: Math.min(i, n) });
      continue;
    }
    if (c === '%' && /[wiWI][[({<]/.test(source.slice(i + 1, i + 3))) {
      const close = { '[': ']', '(': ')', '{': '}', '<': '>' }[source[i + 2] as '['];
      const end = source.indexOf(close, i + 3);
      i = end < 0 ? n : end + 1;
      tokens.push({ text: source.slice(start, i), kind: 'words', start, end: i });
      continue;
    }
    if (c === ':' && /[A-Za-z_"]/.test(source[i + 1] ?? '') && source[i - 1] !== ':' && (valueExpected() || source[i - 1] === ' ' || source[i - 1] === '(')) {
      i++;
      if (source[i] === '"') {
        i++;
        while (i < n && source[i] !== '"') i++;
        i++;
      } else {
        while (i < n && /[\w?!]/.test(source[i])) i++;
      }
      tokens.push({ text: source.slice(start, i), kind: 'sym', start, end: i });
      continue;
    }
    if (c === '/' && valueExpected()) {
      i++;
      while (i < n && source[i] !== '/' && source[i] !== '\n') i += source[i] === '\\' ? 2 : 1;
      i++;
      while (i < n && /[imxo]/.test(source[i])) i++;
      tokens.push({ text: source.slice(start, i), kind: 'regex', start, end: i });
      continue;
    }
    if (/\d/.test(c)) {
      while (i < n && /[\d_]/.test(source[i])) i++;
      if (source[i] === '.' && /\d/.test(source[i + 1] ?? '')) {
        i++;
        while (i < n && /[\d_]/.test(source[i])) i++;
      }
      if (/[eE]/.test(source[i] ?? '') && /[\d+-]/.test(source[i + 1] ?? '')) {
        i += 2;
        while (i < n && /\d/.test(source[i])) i++;
      }
      tokens.push({ text: source.slice(start, i), kind: 'num', start, end: i });
      continue;
    }
    if (/[A-Za-z_@$]/.test(c)) {
      i++;
      while (i < n && /\w/.test(source[i])) i++;
      // A trailing ?/! is part of the name (`empty?`, `sort!`), unless it starts `!=` / `?:`.
      if ((source[i] === '?' || source[i] === '!') && source[i + 1] !== '=') i++;
      const text = source.slice(start, i);
      tokens.push({ text, kind: /^[A-Z]/.test(text) ? 'const' : 'id', start, end: i });
      continue;
    }
    const op = PUNCTUATION.find((candidate) => source.startsWith(candidate, i));
    const text = op ?? c;
    i += text.length;
    tokens.push({ text, kind: 'punct', start, end: i });
  }
  return tokens;
}

// ---------------------------------------------------------------------------------------------
// Corelib tables

interface Entry {
  name: string;
  params: string[];
  block: string[] | undefined;
  returns: string;
  doc?: string;
}

function parseEntry(entry: string): Entry | undefined {
  const match = /^([\w?!=]+)(?:\((.*?)\))?(?: \{(.*?)\})? → (.+?)(?: — (.*))?$/.exec(entry);
  if (!match) return undefined;
  const [, name, params, block, returns, doc] = match;
  return {
    name,
    params: params ? params.split(',').map((param) => param.trim()) : [],
    block: block === undefined ? undefined : splitTypes(block),
    returns,
    doc,
  };
}

function splitTypes(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const c of text) {
    if (c === '[') depth++;
    if (c === ']') depth--;
    if (c === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += c;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** `Array[Hash[K, V]]` with K/V/E/self/$n filled in. */
export function parseTypeText(text: string, bindings: Map<string, Type> = new Map(), args: (Type | undefined)[] = []): Type | undefined {
  const source = text.trim();
  if (source === '?' || source === 'nil' || source === '') return undefined;
  const argument = /^\$(\d)$/.exec(source);
  if (argument) return args[Number(argument[1])];
  const match = /^([\w?]+)(?:\[(.*)\])?$/.exec(source);
  if (!match) return undefined;
  const [, name, inner] = match;
  if (!inner) return bindings.get(name) ?? type(name);
  return type(name, splitTypes(inner).map((part) => parseTypeText(part, bindings, args) ?? UNKNOWN));
}

const signatureOf = (entry: Entry): Signature => ({
  name: entry.name,
  params: entry.params,
  returns: entry.returns,
  block: entry.block,
  doc: entry.doc,
  label: entry.params.length ? `${entry.name}(${entry.params.join(', ')})` : entry.name,
});

function groupEntries(entries: string[]) {
  const byName = new Map<string, Signature[]>();
  for (const text of entries) {
    const entry = parseEntry(text);
    if (!entry) continue;
    const list = byName.get(entry.name) ?? [];
    // A later entry with the same shape overrides (Hash#select over Enumerable#select).
    const shape = (signature: Signature) => `${signature.params.length}/${signature.block ? 'b' : ''}`;
    const signature = signatureOf(entry);
    const same = list.findIndex((existing) => shape(existing) === shape(signature));
    if (same >= 0) list[same] = signature;
    else list.push(signature);
    byName.set(entry.name, list);
  }
  return byName;
}

const classCache = new Map<string, Map<string, Signature[]>>();
export function classMembers(name: string) {
  let members = classCache.get(name);
  if (!members) {
    members = groupEntries(RUBY_CLASSES[name]?.members ?? []);
    classCache.set(name, members);
  }
  return members;
}

let kernelCache: Map<string, Signature[]> | undefined;
export const kernel = () => (kernelCache ??= groupEntries(KERNEL));

const classMethodCache = new Map<string, Map<string, Signature[]>>();
export function classMethods(name: string) {
  let methods = classMethodCache.get(name);
  if (!methods) {
    methods = groupEntries(CLASS_METHODS[name] ?? []);
    classMethodCache.set(name, methods);
  }
  return methods;
}

export function constants(owner: string) {
  return CONSTANTS.map((text) => /^(\w+)::(\w+) → (\S+)(?: — (.*))?$/.exec(text))
    .filter((match): match is RegExpExecArray => !!match && match[1] === owner)
    .map(([, , name, returns, doc]) => ({ name, returns, doc }));
}

// ---------------------------------------------------------------------------------------------
// Analysis

type Lazy =
  | { kind: 'type'; type: Type | undefined }
  | { kind: 'expr'; tokens: Token[] }
  | { kind: 'element'; tokens: Token[] }
  | { kind: 'destructure'; of: Lazy; index: number }
  | { kind: 'block'; call: Token[]; index: number; count: number };

interface Variable {
  name: string;
  at: number;
  value: Lazy;
}

interface Method {
  name: string;
  params: string[];
  at: number;
}

export class Analysis {
  readonly tokens: Token[];
  readonly variables: Variable[] = [];
  readonly methods = new Map<string, Method>();
  private depth = 0;

  private readonly hints: Map<string, string>;

  /** `hints`: parameter name → type text for `def solution(...)` (from the task). */
  constructor(source: string, hints: Map<string, string> = new Map()) {
    this.hints = hints;
    this.tokens = tokenize(source);
    this.scan();
  }

  private scan() {
    const tokens = this.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.text === 'def' && tokens[i + 1]) {
        // def name(a, b = 1, *rest, key: 2, &block)  /  def self.name a, b
        let j = i + 1;
        if (tokens[j].text === 'self' && tokens[j + 1]?.text === '.') j += 2;
        const name = tokens[j];
        const params: Token[] = [];
        j++;
        const parenthesized = tokens[j]?.text === '(';
        if (parenthesized) j++;
        let depth = 0;
        let expectName = true;
        while (tokens[j] && (parenthesized ? !(depth === 0 && tokens[j].text === ')') : tokens[j].kind !== 'nl' && tokens[j].text !== ';')) {
          const text = tokens[j].text;
          if (text === '(' || text === '[' || text === '{') depth++;
          if (text === ')' || text === ']' || text === '}') depth--;
          if (depth === 0 && text === ',') expectName = true;
          else if (expectName && tokens[j].kind === 'id') {
            params.push(tokens[j]);
            expectName = false;
          } else if (!['*', '**', '&'].includes(text)) expectName = false;
          j++;
        }
        if (name) this.methods.set(name.text, { name: name.text, params: params.map((param) => param.text), at: name.start });
        for (const param of params) {
          const hint = name?.text === 'solution' ? this.hints.get(param.text) : undefined;
          this.variables.push({ name: param.text, at: param.start, value: { kind: 'type', type: hint ? parseTypeText(hint) : undefined } });
        }
        i = j;
        continue;
      }

      // Block parameters: call { |a, b| … }  /  call do |a, b| … end
      if ((token.text === '{' || token.text === 'do') && tokens[i + 1]?.text === '|') {
        const names: Token[] = [];
        let j = i + 2;
        while (tokens[j] && tokens[j].text !== '|') {
          if (tokens[j].kind === 'id') names.push(tokens[j]);
          j++;
        }
        const call = this.expressionBefore(tokens.slice(0, i));
        names.forEach((name, index) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'block', call, index, count: names.length } }));
        i = j;
        continue;
      }

      // for x in expr
      if (token.text === 'for' && tokens[i + 1]?.kind === 'id' && tokens[i + 2]?.text === 'in') {
        const expression = this.statement(i + 3, ['do']);
        this.variables.push({ name: tokens[i + 1].text, at: tokens[i + 1].start, value: { kind: 'element', tokens: expression.tokens } });
        continue;
      }

      // a = expr   a, b = expr   @a ||= expr
      if (token.kind === 'id' && (i === 0 || this.statementStart(i))) {
        const names: Token[] = [token];
        let j = i + 1;
        while (tokens[j]?.text === ',' && tokens[j + 1]?.kind === 'id') {
          names.push(tokens[j + 1]);
          j += 2;
        }
        const op = tokens[j]?.text;
        if (op !== '=' && op !== '||=') continue;
        const expression = this.statement(j + 1);
        if (names.length === 1) {
          this.variables.push({ name: token.text, at: token.start, value: { kind: 'expr', tokens: expression.tokens } });
        } else {
          const of: Lazy = { kind: 'expr', tokens: expression.tokens };
          names.forEach((name, index) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'destructure', of, index } }));
        }
      }
    }
  }

  private statementStart(i: number) {
    const before = this.tokens[i - 1];
    return before.kind === 'nl' || before.text === ';' || before.text === '|' || before.text === 'do' || before.text === '{' || before.text === 'then' || before.text === 'else' || (before.text === ',' && this.tokens[i - 2]?.kind === 'id');
  }

  /** Tokens of the statement starting at `start`: up to a newline or `;` at depth 0. */
  private statement(start: number, stops: string[] = []) {
    const tokens = this.tokens;
    let depth = 0;
    let j = start;
    while (tokens[j]) {
      const text = tokens[j].text;
      if (depth === 0 && (text === ';' || stops.includes(text))) break;
      if (depth === 0 && tokens[j].kind === 'nl') {
        // A line ending in an operator or a comma, or a next line starting with `.`, continues.
        const previous = tokens[j - 1];
        const next = tokens[j + 1];
        const continues = (previous?.kind === 'punct' && !')]}'.includes(previous.text)) || next?.text === '.' || next?.text === '&.';
        if (!continues) break;
      }
      if (text === '(' || text === '[' || text === '{' || text === 'do') depth++;
      if (text === ')' || text === ']' || text === '}' || text === 'end') depth--;
      if (depth < 0) break;
      j++;
    }
    return { tokens: tokens.slice(start, j).filter((token) => token.kind !== 'nl'), end: j };
  }

  // --- lookups -----------------------------------------------------------------------------

  variable(name: string, offset: number) {
    let found: Variable | undefined;
    for (const variable of this.variables) if (variable.name === name && variable.at < offset && (!found || variable.at > found.at)) found = variable;
    return found;
  }

  visibleVariables(offset: number) {
    const byName = new Map<string, Variable>();
    for (const variable of this.variables) {
      if (variable.at >= offset) continue;
      const seen = byName.get(variable.name);
      if (!seen || variable.at > seen.at) byName.set(variable.name, variable);
    }
    return [...byName.values()];
  }

  typeOfVariable(name: string, offset: number) {
    const variable = this.variable(name, offset);
    return variable && this.resolve(variable.value, variable.at);
  }

  resolve(value: Lazy, offset: number): Type | undefined {
    if (this.depth > 20) return undefined;
    this.depth++;
    try {
      switch (value.kind) {
        case 'type':
          return value.type;
        case 'expr':
          return this.evaluate(value.tokens, value.tokens[0]?.start ?? offset);
        case 'element': {
          const container = this.evaluate(value.tokens, value.tokens[0]?.start ?? offset);
          return container && elementOf(container);
        }
        case 'destructure': {
          const whole = this.resolve(value.of, offset);
          return whole && (whole.name === 'Tuple' ? whole.args[value.index] : elementOf(whole));
        }
        case 'block':
          return this.blockParam(value.call, value.index, value.count, offset);
      }
    } finally {
      this.depth--;
    }
  }

  /** The type of block parameter `index` (of `count`) of the call `call { |…| }`. */
  private blockParam(call: Token[], index: number, count: number, offset: number): Type | undefined {
    const yields = this.blockYields(call, offset);
    if (!yields) return undefined;
    // One yielded pair over several parameters is splatted: hash.each { |k, v| }.
    if (yields.length === 1 && count > 1) {
      const only = yields[0];
      if (only?.name === 'Tuple') return only.args[index];
      return only && index === 0 ? only : only?.name === 'Array' ? only.args[0] : undefined;
    }
    return yields[index];
  }

  /** What the block of the call at the end of `call` is given. */
  private blockYields(call: Token[], offset: number): (Type | undefined)[] | undefined {
    const target = this.lastCall(call, offset);
    if (!target) return undefined;
    const signature = target.signatures.find((candidate) => candidate.block && candidate.params.length === target.argCount) ?? target.signatures.find((candidate) => candidate.block);
    if (!signature?.block) return undefined;
    return signature.block.map((text) => parseTypeText(text, target.bindings, target.argTypes));
  }

  /** The method called last in a postfix expression: its signatures and receiver bindings. */
  private lastCall(tokens: Token[], offset: number) {
    // Split `recv.name(args)` into the receiver and the call.
    let end = tokens.length;
    let args: Token[] = [];
    if (tokens[end - 1]?.text === ')') {
      const open = matchingBackward(tokens, end - 1);
      args = tokens.slice(open + 1, end - 1);
      end = open;
    }
    const name = tokens[end - 1];
    if (!name || (name.kind !== 'id' && name.kind !== 'const')) return undefined;
    const argTypes = splitArguments(args).map((arg) => this.evaluate(arg, offset));
    const connector = tokens[end - 2]?.text;
    if (connector === '.' || connector === '&.') {
      const receiverTokens = tokens.slice(0, end - 2);
      if (receiverTokens.length === 1 && receiverTokens[0].kind === 'const' && CLASS_METHODS[receiverTokens[0].text]) {
        return { signatures: classMethods(receiverTokens[0].text).get(name.text) ?? [], bindings: new Map<string, Type>(), argTypes, argCount: argTypes.length };
      }
      const receiver = this.evaluate(receiverTokens, offset);
      if (!receiver) return undefined;
      return { signatures: classMembers(receiver.name).get(name.text) ?? [], bindings: bindingsOf(receiver), argTypes, argCount: argTypes.length };
    }
    const signatures = kernel().get(name.text);
    return signatures ? { signatures, bindings: new Map<string, Type>(), argTypes, argCount: argTypes.length } : undefined;
  }

  members(t: Type): Member[] {
    const bindings = bindingsOf(t);
    return [...classMembers(t.name)].map(([name, signatures]) => ({
      name,
      type: parseTypeText(signatures[0].returns, bindings),
      signatures: signatures.map((signature) => ({ ...signature, label: substitute(signature.label, bindings) })),
      doc: signatures[0].doc,
    }));
  }

  /** For an unknown receiver: every class's methods, each name once. */
  allMembers(): Member[] {
    const byName = new Map<string, Member>();
    for (const owner of Object.keys(RUBY_CLASSES)) {
      if (owner === 'Tuple' || owner === 'Symbol') continue;
      for (const [name, signatures] of classMembers(owner)) {
        const seen = byName.get(name);
        if (seen) seen.owners?.push(owner);
        else byName.set(name, { name, type: undefined, signatures, doc: signatures[0].doc, owners: [owner] });
      }
    }
    return [...byName.values()];
  }

  // --- expressions -------------------------------------------------------------------------

  evaluate(tokens: Token[], offset: number): Type | undefined {
    if (!tokens.length) return undefined;
    const left = this.postfix(tokens, 0, offset);
    if (!left) return undefined;
    const op = tokens[left.next]?.text;
    if (op === '..' || op === '...') return type('Range', [left.type ?? UNKNOWN]);
    if (['==', '!=', '<', '>', '<=', '>=', '=~', '===', '&&', '||', 'and', 'or'].includes(op ?? '')) return type('Boolean');
    if (op === '<=>') return type('Integer');
    if (op === '?') return undefined;
    // Arithmetic keeps the left operand's type (Integer / Float mixes aside).
    return left.type;
  }

  private postfix(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const primary = this.primary(tokens, i, offset);
    if (!primary) return undefined;
    let { type: current, next: j } = primary;
    while (tokens[j]) {
      const text = tokens[j].text;
      if ((text === '.' || text === '&.') && (tokens[j + 1]?.kind === 'id' || tokens[j + 1]?.kind === 'const')) {
        const name = tokens[j + 1].text;
        j += 2;
        let args: Token[] = [];
        if (tokens[j]?.text === '(' && tokens[j].start === tokens[j - 1].end) {
          const close = matching(tokens, j);
          args = tokens.slice(j + 1, close);
          j = close + 1;
        }
        let block: { tokens: Token[]; params: Token[] } | undefined;
        if (tokens[j]?.text === '{' || tokens[j]?.text === 'do') {
          const close = matching(tokens, j);
          block = blockParts(tokens.slice(j + 1, close));
          j = close + 1;
        }
        current = current && this.callResult(current, name, args, block, offset);
        continue;
      }
      if (text === '[' && tokens[j].start === tokens[j - 1].end) {
        current = current && indexOf(current);
        j = matching(tokens, j) + 1;
        continue;
      }
      break;
    }
    return { type: current, next: j };
  }

  private callResult(receiver: Type, name: string, argTokens: Token[], block: { tokens: Token[]; params: Token[] } | undefined, offset: number): Type | undefined {
    const args = splitArguments(argTokens);
    // nums.map(&:to_i): the element's method gives the result elements.
    const symbolBlock = args.length === 1 && args[0][0]?.text === '&' && args[0][1]?.kind === 'sym' ? args[0][1].text.slice(1) : undefined;
    const signatures = receiver.name === 'Class' ? [] : (classMembers(receiver.name).get(name) ?? []);
    const positional = symbolBlock ? [] : args;
    const signature =
      signatures.find((candidate) => candidate.params.length === positional.length && !!candidate.block === !!(block || symbolBlock)) ??
      signatures.find((candidate) => candidate.params.length === positional.length) ??
      signatures[0];
    if (!signature) return undefined;
    const bindings = bindingsOf(receiver);
    const argTypes = positional.map((arg) => this.evaluate(arg, offset));
    const result = parseTypeText(signature.returns === 'self' ? typeToString(receiver) : signature.returns, bindings, argTypes);
    // Array[?] from map/flat_map/filter_map: the block's value decides the element.
    if (result?.name === 'Array' && result.args[0]?.name === '?' && /^(map|collect|filter_map)$/.test(name)) {
      const element = elementOf(receiver);
      let value: Type | undefined;
      if (symbolBlock && element) value = parseTypeText(classMembers(element.name).get(symbolBlock)?.[0]?.returns ?? '?', bindingsOf(element));
      else if (block) value = this.evaluate(lastStatement(block.tokens), block.tokens[0]?.start ?? offset);
      if (value) return type('Array', [value]);
    }
    return result;
  }

  private primary(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const token = tokens[i];
    if (!token) return undefined;
    switch (token.kind) {
      case 'num':
        return { type: type(/[.eE]/.test(token.text) ? 'Float' : 'Integer'), next: i + 1 };
      case 'str':
        return { type: type('String'), next: i + 1 };
      case 'sym':
        return { type: type('Symbol'), next: i + 1 };
      case 'words':
        return { type: type('Array', [type(/^%[iI]/.test(token.text) ? 'Symbol' : 'String')]), next: i + 1 };
      case 'regex':
        return { type: type('Regexp'), next: i + 1 };
      default:
        break;
    }
    if (token.text === '-' || token.text === '!' || token.text === 'not') {
      const inner = this.postfix(tokens, i + 1, offset);
      return { type: token.text === '-' ? inner?.type : type('Boolean'), next: inner?.next ?? i + 1 };
    }
    if (token.text === '(') {
      const close = matching(tokens, i);
      return { type: this.evaluate(tokens.slice(i + 1, close), offset), next: close + 1 };
    }
    if (token.text === '[') {
      const close = matching(tokens, i);
      const first = splitArguments(tokens.slice(i + 1, close))[0];
      return { type: type('Array', [(first && this.evaluate(first, offset)) ?? UNKNOWN]), next: close + 1 };
    }
    if (token.text === '{') {
      const close = matching(tokens, i);
      const first = splitArguments(tokens.slice(i + 1, close))[0] ?? [];
      // { key: value } or { "key" => value }
      let key: Type | undefined;
      let value: Type | undefined;
      if (first[0]?.kind === 'id' && first[1]?.text === ':') {
        key = type('Symbol');
        value = this.evaluate(first.slice(2), offset);
      } else {
        const arrow = first.findIndex((part) => part.text === '=>');
        if (arrow > 0) {
          key = this.evaluate(first.slice(0, arrow), offset);
          value = this.evaluate(first.slice(arrow + 1), offset);
        }
      }
      return { type: type('Hash', [key ?? UNKNOWN, value ?? UNKNOWN]), next: close + 1 };
    }
    if (token.text === 'true' || token.text === 'false') return { type: type('Boolean'), next: i + 1 };
    if (token.text === 'nil') return { type: undefined, next: i + 1 };

    if (token.kind === 'const') {
      // Math::PI, Float::INFINITY
      if (tokens[i + 1]?.text === '::' && tokens[i + 2]) {
        const constant = constants(token.text).find((candidate) => candidate.name === tokens[i + 2].text);
        return { type: constant ? parseTypeText(constant.returns) : undefined, next: i + 3 };
      }
      // Array.new(n, 0), Hash.new(0), Set.new
      if ((tokens[i + 1]?.text === '.') && tokens[i + 2] && CLASS_METHODS[token.text]) {
        const name = tokens[i + 2].text;
        let j = i + 3;
        let args: Token[] = [];
        if (tokens[j]?.text === '(') {
          const close = matching(tokens, j);
          args = tokens.slice(j + 1, close);
          j = close + 1;
        }
        const hasBlock = tokens[j]?.text === '{' || tokens[j]?.text === 'do';
        let blockValue: Type | undefined;
        if (hasBlock) {
          const close = matching(tokens, j);
          const body = blockParts(tokens.slice(j + 1, close)).tokens;
          // Array.new(n) { … }: the block's value is the element.
          if (token.text === 'Array') blockValue = this.evaluate(lastStatement(body), body[0]?.start ?? offset);
          j = close + 1;
        }
        const parts = splitArguments(args);
        const signatures = classMethods(token.text).get(name) ?? [];
        const signature = signatures.find((candidate) => candidate.params.length === parts.length && !!candidate.block === hasBlock) ?? signatures.find((candidate) => candidate.params.length === parts.length) ?? signatures[0];
        const argTypes = parts.map((part) => this.evaluate(part, offset));
        const result = signature ? parseTypeText(signature.returns, new Map(), argTypes) : undefined;
        return { type: blockValue && result?.name === 'Array' ? type('Array', [blockValue]) : result, next: j };
      }
      return { type: undefined, next: i + 1 };
    }

    if (token.kind === 'id') {
      const variable = this.typeOfVariable(token.text, offset);
      if (variable || this.variable(token.text, offset)) return { type: variable, next: i + 1 };
      const signatures = kernel().get(token.text);
      if (signatures) {
        let j = i + 1;
        let args: Token[] = [];
        if (tokens[j]?.text === '(' && tokens[j].start === token.end) {
          const close = matching(tokens, j);
          args = tokens.slice(j + 1, close);
          j = close + 1;
        }
        const argTypes = splitArguments(args).map((part) => this.evaluate(part, offset));
        return { type: parseTypeText(signatures[0].returns, new Map(), argTypes), next: j };
      }
      return { type: undefined, next: i + 1 };
    }
    return undefined;
  }

  // --- cursor context ----------------------------------------------------------------------

  tokensBefore(offset: number) {
    let end = 0;
    while (end < this.tokens.length && this.tokens[end].end <= offset) end++;
    const before = this.tokens.slice(0, end);
    const last = before.at(-1);
    if (last && (last.kind === 'id' || last.kind === 'const') && last.end === offset) before.pop();
    return before;
  }

  /** The postfix expression ending at `tokens.at(-1)` (a receiver, or a call with a block). */
  expressionBefore(tokens: Token[]): Token[] {
    let i = tokens.length - 1;
    for (;;) {
      const token = tokens[i];
      if (!token) break;
      if (token.text === ')' || token.text === ']' || token.text === '}') {
        i = matchingBackward(tokens, i) - 1;
        // name(args), x[i], call { block }
        if (tokens[i] && (tokens[i].kind === 'id' || tokens[i].kind === 'const') && tokens[i].end === tokens[i + 1].start) i--;
        else if (tokens[i]?.text === ')' || tokens[i]?.text === ']') continue;
        else if (tokens[i] && (tokens[i].kind === 'id' || tokens[i].kind === 'const') && token.text === '}') i--;
      } else if (token.kind === 'id' || token.kind === 'const' || token.kind === 'num' || token.kind === 'str' || token.kind === 'sym' || token.kind === 'words') {
        if (token.kind === 'id' && KEYWORDS.has(token.text)) break;
        i--;
      } else {
        break;
      }
      const connector = tokens[i]?.text;
      if (connector === '.' || connector === '&.' || connector === '::') {
        i--;
        continue;
      }
      break;
    }
    return tokens.slice(i + 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers

function bindingsOf(t: Type) {
  const params = RUBY_CLASSES[t.name]?.params ?? [];
  return new Map<string, Type>(params.map((param, index) => [param, t.args[index] ?? UNKNOWN]));
}

function substitute(text: string, bindings: Map<string, Type>) {
  return text.replace(/\b[EKVAB]\b/g, (param) => (bindings.has(param) ? typeToString(bindings.get(param)) : param));
}

export function elementOf(t: Type): Type | undefined {
  if (t.name === 'Array' || t.name === 'Set' || t.name === 'Range') return t.args[0]?.name === '?' ? undefined : t.args[0];
  if (t.name === 'Hash') return type('Tuple', [t.args[0] ?? UNKNOWN, t.args[1] ?? UNKNOWN]);
  if (t.name === 'String') return type('String');
  return undefined;
}

function indexOf(t: Type): Type | undefined {
  const index = RUBY_CLASSES[t.name]?.index;
  if (!index) return undefined;
  const result = parseTypeText(index, bindingsOf(t));
  return result?.name === '?' ? undefined : result;
}

function matching(tokens: Token[], open: number) {
  const close: Record<string, string> = { '(': ')', '[': ']', '{': '}', do: 'end' };
  const opener = tokens[open].text;
  let depth = 0;
  for (let j = open; j < tokens.length; j++) {
    const text = tokens[j].text;
    if (opener === 'do' ? text === 'do' || /^(def|if|unless|while|until|case|begin|class|module)$/.test(text) && isBlockKeyword(tokens, j) : text === opener) depth++;
    else if (text === close[opener] && --depth === 0) return j;
  }
  return tokens.length - 1;
}

/** `if`/`unless`/`while` open a block only at the start of a statement (not as modifiers). */
function isBlockKeyword(tokens: Token[], j: number) {
  if (!/^(if|unless|while|until)$/.test(tokens[j].text)) return true;
  const before = tokens[j - 1];
  return !before || before.kind === 'nl' || before.text === ';' || before.text === '=' || before.text === '(';
}

function matchingBackward(tokens: Token[], close: number) {
  const open: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const closer = tokens[close].text;
  let depth = 0;
  for (let j = close; j >= 0; j--) {
    if (tokens[j].text === closer) depth++;
    else if (tokens[j].text === open[closer] && --depth === 0) return j;
  }
  return 0;
}

export function splitArguments(tokens: Token[]) {
  const parts: Token[][] = [];
  let depth = 0;
  let current: Token[] = [];
  for (const token of tokens) {
    if (token.text === '(' || token.text === '[' || token.text === '{') depth++;
    if (token.text === ')' || token.text === ']' || token.text === '}') depth--;
    if (token.text === ',' && depth === 0) {
      parts.push(current);
      current = [];
    } else if (token.kind !== 'nl') {
      current.push(token);
    }
  }
  if (current.length) parts.push(current);
  return parts;
}

function blockParts(tokens: Token[]) {
  if (tokens[0]?.text !== '|') return { tokens, params: [] };
  const close = tokens.findIndex((token, index) => index > 0 && token.text === '|');
  return { tokens: tokens.slice(close + 1), params: tokens.slice(1, close) };
}

/** The last statement of a block body: its value. */
function lastStatement(tokens: Token[]) {
  let start = 0;
  let depth = 0;
  tokens.forEach((token, index) => {
    if (token.text === '(' || token.text === '[' || token.text === '{') depth++;
    if (token.text === ')' || token.text === ']' || token.text === '}') depth--;
    if (depth === 0 && (token.kind === 'nl' || token.text === ';') && index < tokens.length - 1) start = index + 1;
  });
  return tokens.slice(start).filter((token) => token.kind !== 'nl');
}
