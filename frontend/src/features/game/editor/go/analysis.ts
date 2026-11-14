// A small Go analyser for battle solutions: types from parameters, `var`, `:=` (including
// `v, ok := m[k]` and multi-value calls), `range` loops, composite literals, `make`/`append`,
// the file's structs and methods and the library (./library), so that `x.` lists fields and
// methods and `strings.` the package. No scopes beyond "the nearest declaration before the
// cursor". No Monaco here.

import { BASIC_TYPES, BUILTINS, PACKAGES, TYPE_METHODS } from './library';

export interface Type {
  name: string;
  args: Type[];
}

export interface Signature {
  name: string;
  params: string[];
  returns: string;
  doc?: string;
  label: string;
}

export interface Member {
  name: string;
  kind: 'method' | 'field' | 'func' | 'const' | 'type';
  type: Type | undefined;
  signatures: Signature[];
  doc?: string;
}

export interface Token {
  text: string;
  kind: 'id' | 'num' | 'str' | 'char' | 'punct' | 'nl';
  start: number;
  end: number;
}

export const type = (name: string, args: Type[] = []): Type => ({ name, args });
const UNKNOWN = type('?');
const BASIC = new Set(BASIC_TYPES);

export function typeToString(t: Type | undefined): string {
  if (!t) return '?';
  switch (t.name) {
    case '[]':
      return `[]${typeToString(t.args[0])}`;
    case '*':
      return `*${typeToString(t.args[0])}`;
    case 'map':
      return `map[${typeToString(t.args[0])}]${typeToString(t.args[1])}`;
    case 'tuple':
      return `(${t.args.map(typeToString).join(', ')})`;
    default:
      return t.name;
  }
}

// ---------------------------------------------------------------------------------------------
// Tokens

const PUNCTUATION = ['<<=', '>>=', '&^=', '...', ':=', '<-', '&&', '||', '==', '!=', '<=', '>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '&^'];

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const n = source.length;
  let i = 0;
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
    if (c === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      i++;
      while (i < n && source[i] !== c && (c === '`' || source[i] !== '\n')) i += source[i] === '\\' && c !== '`' ? 2 : 1;
      i++;
      tokens.push({ text: source.slice(start, Math.min(i, n)), kind: c === "'" ? 'char' : 'str', start, end: Math.min(i, n) });
      continue;
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(source[i + 1] ?? ''))) {
      while (i < n && /[\w.]/.test(source[i])) i++;
      tokens.push({ text: source.slice(start, i), kind: 'num', start, end: i });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      while (i < n && /\w/.test(source[i])) i++;
      tokens.push({ text: source.slice(start, i), kind: 'id', start, end: i });
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
// Library tables

interface Entry {
  name: string;
  params: string[] | undefined;
  returns: string;
  doc?: string;
}

function parseEntry(text: string): Entry | undefined {
  const match = /^(\w+)(?:\((.*)\))?: (.+?)(?: — (.*))?$/.exec(text);
  if (!match) return undefined;
  const [, name, params, returns, doc] = match;
  return { name, params: params === undefined ? undefined : splitText(params), returns, doc };
}

function splitText(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const c of text) {
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += c;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function entryMembers(entries: string[], funcKind: Member['kind']): Member[] {
  const byName = new Map<string, Member>();
  for (const text of entries) {
    const entry = parseEntry(text);
    if (!entry) continue;
    const member = byName.get(entry.name) ?? {
      name: entry.name,
      kind: entry.params ? funcKind : /^[A-Z]/.test(entry.returns) || entry.returns.includes('.') ? 'type' : 'const',
      type: entry.params ? undefined : parseTypeText(entry.returns),
      signatures: [],
      doc: entry.doc,
    };
    if (entry.params) member.signatures.push({ name: entry.name, params: entry.params, returns: entry.returns, doc: entry.doc, label: `${entry.name}(${entry.params.join(', ')})` });
    byName.set(entry.name, member);
  }
  return [...byName.values()];
}

const packageCache = new Map<string, Member[]>();
export function packageMembers(name: string) {
  let members = packageCache.get(name);
  if (!members) {
    members = entryMembers(PACKAGES[name] ?? [], 'func');
    packageCache.set(name, members);
  }
  return members;
}

let builtinCache: Map<string, Signature[]> | undefined;
export function builtins() {
  if (!builtinCache) {
    builtinCache = new Map(entryMembers(BUILTINS, 'func').map((member) => [member.name, member.signatures]));
  }
  return builtinCache;
}

/** A Go type written as text (`[]int`, `map[string][]int`, `(int, error)`), `$n` filled in. */
export function parseTypeText(text: string, args: (Type | undefined)[] = []): Type | undefined {
  const source = text.trim();
  const element = /^elem\(\$(\d)\)$/.exec(source);
  if (element) return elementOf(args[Number(element[1])]);
  const argument = /^\$(\d)$/.exec(source);
  if (argument) return args[Number(argument[1])];
  if (source === 'void' || source === '') return undefined;
  if (source.startsWith('(')) return type('tuple', splitText(source.slice(1, -1)).map((part) => parseTypeText(part, args) ?? UNKNOWN));
  const pointer = /^\*(.*)$/.exec(source);
  if (pointer) return type('*', [parseTypeText(pointer[1], args) ?? UNKNOWN]);
  const tokens = tokenize(source);
  return parseTypeTokens(tokens, 0)?.type;
}

/** Parses a type at tokens[i]. */
export function parseTypeTokens(tokens: Token[], i: number, isType: (name: string) => boolean = () => true): { type: Type; next: number } | undefined {
  const token = tokens[i];
  if (!token) return undefined;
  if (token.text === '...') {
    const inner = parseTypeTokens(tokens, i + 1, isType);
    return inner && { type: type('[]', [inner.type]), next: inner.next };
  }
  if (token.text === '[') {
    // []T or [N]T
    let j = i + 1;
    while (tokens[j] && tokens[j].text !== ']') j++;
    const inner = parseTypeTokens(tokens, j + 1, isType);
    return inner && { type: type('[]', [inner.type]), next: inner.next };
  }
  if (token.text === '*') {
    const inner = parseTypeTokens(tokens, i + 1, isType);
    return inner && { type: type('*', [inner.type]), next: inner.next };
  }
  if (token.text === 'map' && tokens[i + 1]?.text === '[') {
    const key = parseTypeTokens(tokens, i + 2, isType);
    if (!key || tokens[key.next]?.text !== ']') return undefined;
    const value = parseTypeTokens(tokens, key.next + 1, isType);
    return value && { type: type('map', [key.type, value.type]), next: value.next };
  }
  if (token.text === 'chan') {
    const inner = parseTypeTokens(tokens, i + 1, isType);
    return inner && { type: type('chan', [inner.type]), next: inner.next };
  }
  if (token.text === 'func') {
    let j = i + 1;
    if (tokens[j]?.text === '(') j = matching(tokens, j) + 1;
    // An optional result type on the same line.
    if (tokens[j]?.text === '(') j = matching(tokens, j) + 1;
    else if (tokens[j] && tokens[j].text !== '{' && tokens[j].text !== ',' && tokens[j].text !== ')' && tokens[j].kind !== 'nl') {
      const result = parseTypeTokens(tokens, j, isType);
      if (result) j = result.next;
    }
    return { type: type('func'), next: j };
  }
  if (token.text === 'struct' || token.text === 'interface') {
    const j = tokens[i + 1]?.text === '{' ? matching(tokens, i + 1) + 1 : i + 1;
    return { type: type(token.text === 'struct' ? 'struct' : 'any'), next: j };
  }
  if (token.kind !== 'id') return undefined;
  // pkg.Type
  if (tokens[i + 1]?.text === '.' && tokens[i + 2]?.kind === 'id' && PACKAGES[token.text]) {
    return { type: type(`${token.text}.${tokens[i + 2].text}`), next: i + 3 };
  }
  if (!isType(token.text)) return undefined;
  return { type: type(token.text), next: i + 1 };
}

export function elementOf(t: Type | undefined): Type | undefined {
  if (!t) return undefined;
  if (t.name === '[]' || t.name === 'chan') return t.args[0];
  if (t.name === 'map') return t.args[1];
  if (t.name === 'string') return type('byte');
  if (t.name === '*') return elementOf(t.args[0]);
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Analysis

type Lazy =
  | { kind: 'type'; type: Type | undefined }
  | { kind: 'expr'; tokens: Token[]; index: number; count: number }
  | { kind: 'range'; tokens: Token[]; index: number };

interface Variable {
  name: string;
  at: number;
  value: Lazy;
}

interface Func {
  name: string;
  params: string[];
  returns: Type | undefined;
  at: number;
}

interface Struct {
  name: string;
  fields: { name: string; type: Type | undefined }[];
  methods: Func[];
}

export class Analysis {
  readonly tokens: Token[];
  readonly variables: Variable[] = [];
  readonly functions = new Map<string, Func>();
  readonly structs = new Map<string, Struct>();
  private readonly aliases = new Map<string, Type>();
  private depth = 0;

  constructor(source: string) {
    this.tokens = tokenize(source);
    // Type names first, so declarations anywhere can use them.
    for (let i = 0; i < this.tokens.length - 1; i++) {
      if (this.tokens[i].text === 'type' && this.tokens[i + 1].kind === 'id') {
        this.structs.set(this.tokens[i + 1].text, { name: this.tokens[i + 1].text, fields: [], methods: [] });
      }
    }
    this.scan();
  }

  isType = (name: string) => BASIC.has(name) || this.structs.has(name) || this.aliases.has(name);

  private parseType(tokens: Token[], i: number) {
    const parsed = parseTypeTokens(tokens, i, this.isType);
    if (!parsed) return undefined;
    const alias = this.aliases.get(parsed.type.name);
    return alias ? { type: alias, next: parsed.next } : parsed;
  }

  private scan() {
    const tokens = this.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // type Name struct { … }  /  type Name []int
      if (token.text === 'type' && tokens[i + 1]?.kind === 'id') {
        const name = tokens[i + 1].text;
        if (tokens[i + 2]?.text === 'struct' && tokens[i + 3]?.text === '{') {
          const close = matching(tokens, i + 3);
          const struct = this.structs.get(name)!;
          for (const line of splitLines(tokens.slice(i + 4, close))) {
            const names = line.filter((part, index) => part.kind === 'id' && (index === 0 || line[index - 1].text === ','));
            const typeStart = line.findIndex((part, index) => index > 0 && line[index - 1].kind === 'id' && part.text !== ',');
            const fieldType = typeStart > 0 ? this.parseType(line, typeStart)?.type : undefined;
            for (const field of typeStart > 0 ? names.filter((part) => part.start < line[typeStart].start) : []) struct.fields.push({ name: field.text, type: fieldType });
          }
          i = close;
        } else {
          const aliased = this.parseType(tokens, i + 2 + (tokens[i + 2]?.text === '=' ? 1 : 0));
          if (aliased && aliased.type.name !== 'struct') {
            this.structs.delete(name);
            this.aliases.set(name, aliased.type);
          }
        }
        continue;
      }

      // func (r *T) Name(params) results {   /   func Name(params) results {
      if (token.text === 'func' && tokens[i - 1]?.kind !== 'punct') {
        let j = i + 1;
        let receiver: { name: Token; type: Type | undefined } | undefined;
        if (tokens[j]?.text === '(') {
          const close = matching(tokens, j);
          const params = this.params(tokens.slice(j + 1, close));
          if (params[0]) receiver = params[0];
          j = close + 1;
        }
        const name = tokens[j];
        if (name?.kind !== 'id' || tokens[j + 1]?.text !== '(') continue;
        const close = matching(tokens, j + 1);
        const params = this.params(tokens.slice(j + 2, close));
        let results: Type | undefined;
        if (tokens[close + 1]?.text === '(') {
          const resultClose = matching(tokens, close + 1);
          const parts = this.params(tokens.slice(close + 2, resultClose));
          results = parts.length === 1 ? parts[0].type : type('tuple', parts.map((part) => part.type ?? UNKNOWN));
        } else if (tokens[close + 1] && tokens[close + 1].text !== '{') {
          results = this.parseType(tokens, close + 1)?.type;
        }
        const fn: Func = { name: name.text, params: params.map((param) => `${param.name.text} ${typeToString(param.type)}`), returns: results, at: name.start };
        if (receiver) {
          const owner = receiver.type?.name === '*' ? receiver.type.args[0] : receiver.type;
          this.structs.get(owner?.name ?? '')?.methods.push(fn);
          this.variables.push({ name: receiver.name.text, at: receiver.name.start, value: { kind: 'type', type: receiver.type } });
        } else {
          this.functions.set(name.text, fn);
        }
        for (const param of params) this.variables.push({ name: param.name.text, at: param.name.start, value: { kind: 'type', type: param.type } });
        i = close;
        continue;
      }

      // var a, b T = …   /   var a = …
      if (token.text === 'var' && tokens[i + 1]?.kind === 'id') {
        const names: Token[] = [];
        let j = i + 1;
        while (tokens[j]?.kind === 'id') {
          names.push(tokens[j]);
          if (tokens[j + 1]?.text !== ',') break;
          j += 2;
        }
        j++;
        const declared = tokens[j]?.text === '=' ? undefined : this.parseType(tokens, j);
        if (declared) j = declared.next;
        if (declared) names.forEach((name) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'type', type: declared.type } }));
        else if (tokens[j]?.text === '=') {
          const expression = statement(tokens, j + 1);
          names.forEach((name, index) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'expr', tokens: expression, index, count: names.length } }));
        }
        continue;
      }

      // a, b := expr   /   for i, v := range expr
      if (token.text === ':=') {
        const names: Token[] = [];
        let j = i - 1;
        while (tokens[j]?.kind === 'id') {
          names.unshift(tokens[j]);
          if (tokens[j - 1]?.text !== ',') break;
          j -= 2;
        }
        if (tokens[i + 1]?.text === 'range') {
          const expression = statement(tokens, i + 2, '{');
          names.forEach((name, index) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'range', tokens: expression, index } }));
        } else {
          // Stops at `;` too: for i := 0; …   if v, ok := m[k]; ok {
          const expression = statement(tokens, i + 1);
          names.forEach((name, index) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'expr', tokens: expression, index, count: names.length } }));
        }
      }
    }
  }

  /** Parameter list `a, b int, s string` (or unnamed `int, error`). */
  private params(tokens: Token[]) {
    const groups = splitArguments(tokens);
    const result: { name: Token; type: Type | undefined }[] = [];
    let pending: Token[] = [];
    for (const group of groups) {
      if (group.length === 1 && group[0].kind === 'id' && !this.isType(group[0].text)) {
        pending.push(group[0]);
        continue;
      }
      const named = group[0]?.kind === 'id' && group.length > 1 && !(PACKAGES[group[0].text] && group[1]?.text === '.');
      const parsed = this.parseType(group, named ? 1 : 0);
      for (const name of pending) result.push({ name, type: parsed?.type });
      pending = [];
      result.push({ name: named ? group[0] : { text: '_', kind: 'id', start: group[0]?.start ?? 0, end: group[0]?.end ?? 0 }, type: parsed?.type });
    }
    // Only types: `(int, error)`.
    for (const name of pending) result.push({ name: { ...name, text: '_' }, type: this.parseType([name], 0)?.type });
    return result;
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
      if (variable.at >= offset || variable.name === '_') continue;
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
      if (value.kind === 'type') return value.type;
      const at = value.tokens[0]?.start ?? offset;
      if (value.kind === 'range') {
        const over = this.evaluate(value.tokens, at);
        const base = over?.name === '*' ? over.args[0] : over;
        if (!base) return undefined;
        if (base.name === 'map') return base.args[value.index];
        if (base.name === 'string') return type(value.index === 0 ? 'int' : 'rune');
        if (base.name === 'chan') return base.args[0];
        if (base.name === '[]') return value.index === 0 ? type('int') : base.args[0];
        return type('int'); // range over an integer
      }
      // v, ok := m[k]
      if (value.count === 2 && value.index === 1 && value.tokens.at(-1)?.text === ']') {
        const indexed = this.evaluate(value.tokens.slice(0, matchingBackward(value.tokens, value.tokens.length - 1)), at);
        if (indexed?.name === 'map') return type('bool');
      }
      const result = this.evaluate(value.tokens, at);
      if (result?.name === 'tuple') return result.args[value.index];
      return value.index === 0 ? result : undefined;
    } finally {
      this.depth--;
    }
  }

  /** Fields and methods of a value of type t (pointers are followed). */
  members(t: Type): Member[] {
    const base = t.name === '*' ? t.args[0] : t;
    if (!base) return [];
    const struct = this.structs.get(base.name);
    if (struct) {
      return [
        ...struct.fields.map((field): Member => ({ name: field.name, kind: 'field', type: field.type, signatures: [] })),
        ...struct.methods.map((method): Member => ({ name: method.name, kind: 'method', type: method.returns, signatures: [{ name: method.name, params: method.params, returns: typeToString(method.returns), label: `${method.name}(${method.params.join(', ')})` }] })),
      ];
    }
    return entryMembers(TYPE_METHODS[base.name] ?? [], 'method');
  }

  isPackage(name: string, offset: number) {
    return !!PACKAGES[name] && !this.variable(name, offset);
  }

  // --- expressions -------------------------------------------------------------------------

  evaluate(tokens: Token[], offset: number): Type | undefined {
    const left = this.postfix(tokens, 0, offset);
    if (!left) return undefined;
    const op = tokens[left.next]?.text;
    if (['==', '!=', '<', '>', '<=', '>=', '&&', '||'].includes(op ?? '')) return type('bool');
    return left.type;
  }

  private postfix(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const primary = this.primary(tokens, i, offset);
    if (!primary) return undefined;
    let { type: current, next: j } = primary;
    while (tokens[j]) {
      const text = tokens[j].text;
      if (text === '.' && tokens[j + 1]?.kind === 'id') {
        const member = current && this.members(current).find((candidate) => candidate.name === tokens[j + 1].text);
        j += 2;
        if (tokens[j]?.text === '(') {
          const close = matching(tokens, j);
          current = member?.signatures.length ? this.callResult(member.signatures[0], tokens.slice(j + 1, close), offset) : undefined;
          j = close + 1;
        } else {
          current = member?.kind === 'field' ? member.type : undefined;
        }
        continue;
      }
      if (text === '[') {
        const close = matching(tokens, j);
        const slice = tokens.slice(j + 1, close).some((part) => part.text === ':');
        const base = current?.name === '*' ? current.args[0] : current;
        current = slice ? current : elementOf(base);
        j = close + 1;
        continue;
      }
      break;
    }
    return { type: current, next: j };
  }

  private callResult(signature: Signature, argTokens: Token[], offset: number) {
    const argTypes = splitArguments(argTokens).map((arg) => this.evaluate(arg, offset));
    return parseTypeText(signature.returns, argTypes);
  }

  private primary(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const token = tokens[i];
    if (!token) return undefined;
    if (token.kind === 'num') return { type: type(/[.eE]/.test(token.text) && !/^0x/i.test(token.text) ? 'float64' : 'int'), next: i + 1 };
    if (token.kind === 'str') return { type: type('string'), next: i + 1 };
    if (token.kind === 'char') return { type: type('rune'), next: i + 1 };
    if (token.text === '(') {
      const close = matching(tokens, i);
      return { type: this.evaluate(tokens.slice(i + 1, close), offset), next: close + 1 };
    }
    if (token.text === '&') {
      const inner = this.postfix(tokens, i + 1, offset);
      return inner && { type: inner.type && type('*', [inner.type]), next: inner.next };
    }
    if (token.text === '*') {
      const inner = this.postfix(tokens, i + 1, offset);
      return inner && { type: inner.type?.name === '*' ? inner.type.args[0] : undefined, next: inner.next };
    }
    if (token.text === '-' || token.text === '+' || token.text === '^') return this.postfix(tokens, i + 1, offset);
    if (token.text === '!') return { type: type('bool'), next: this.postfix(tokens, i + 1, offset)?.next ?? i + 1 };

    // Composite literals and conversions: []int{…}, map[string]int{}, Point{…}, []byte(s), int(x)
    if (token.text === '[' || token.text === 'map' || (token.kind === 'id' && (this.isType(token.text) || (PACKAGES[token.text] && /^[A-Z]/.test(tokens[i + 2]?.text ?? '') && tokens[i + 3]?.text === '{')))) {
      const parsed = this.parseType(tokens, i);
      if (parsed && (tokens[parsed.next]?.text === '{' || tokens[parsed.next]?.text === '(')) {
        return { type: parsed.type, next: matching(tokens, parsed.next) + 1 };
      }
    }
    if (token.kind !== 'id') return undefined;
    if (token.text === 'true' || token.text === 'false') return { type: type('bool'), next: i + 1 };
    if (token.text === 'nil') return { type: undefined, next: i + 1 };

    // pkg.Func(…), pkg.Const
    if (this.isPackage(token.text, offset) && tokens[i + 1]?.text === '.' && tokens[i + 2]?.kind === 'id') {
      const member = packageMembers(token.text).find((candidate) => candidate.name === tokens[i + 2].text);
      if (tokens[i + 3]?.text === '(') {
        const close = matching(tokens, i + 3);
        return { type: member?.signatures[0] ? this.callResult(member.signatures[0], tokens.slice(i + 4, close), offset) : undefined, next: close + 1 };
      }
      return { type: member?.kind === 'type' ? undefined : member?.type, next: i + 3 };
    }

    if (tokens[i + 1]?.text === '(') {
      const close = matching(tokens, i + 1);
      const args = tokens.slice(i + 2, close);
      // make(T, …) and new(T) take a type.
      if (token.text === 'make' || token.text === 'new') {
        const made = this.parseType(args, 0)?.type;
        return { type: made && (token.text === 'new' ? type('*', [made]) : made), next: close + 1 };
      }
      const user = this.functions.get(token.text);
      if (user) return { type: user.returns, next: close + 1 };
      const builtin = builtins().get(token.text)?.[0];
      if (builtin) return { type: this.callResult(builtin, args, offset), next: close + 1 };
      return { type: undefined, next: close + 1 };
    }
    return { type: this.typeOfVariable(token.text, offset), next: i + 1 };
  }

  // --- cursor context ----------------------------------------------------------------------

  tokensBefore(offset: number) {
    let end = 0;
    while (end < this.tokens.length && this.tokens[end].end <= offset) end++;
    const before = this.tokens.slice(0, end).filter((token) => token.kind !== 'nl' || token.end <= offset);
    const last = before.at(-1);
    if (last && last.kind === 'id' && last.end === offset) before.pop();
    return before;
  }

  expressionBefore(tokens: Token[]): Token[] {
    let i = tokens.length - 1;
    for (;;) {
      const token = tokens[i];
      if (!token) break;
      if (token.text === ')' || token.text === ']' || token.text === '}') {
        i = matchingBackward(tokens, i) - 1;
        // f(x), s[i], T{…}, map[K]V{…}, []int{…}
        while (tokens[i] && (tokens[i].kind === 'id' || tokens[i].text === ']' || tokens[i].text === '*') && tokens[i].kind !== 'nl') {
          if (tokens[i].text === ']') i = matchingBackward(tokens, i) - 1;
          else i--;
          if (tokens[i]?.text === '.' || tokens[i]?.kind === 'nl') break;
        }
      } else if (token.kind === 'id' || token.kind === 'num' || token.kind === 'str' || token.kind === 'char') {
        i--;
      } else {
        break;
      }
      if (tokens[i]?.text === '.') {
        i--;
        continue;
      }
      if (tokens[i]?.text === '&' && !['id', 'num'].includes(tokens[i - 1]?.kind ?? '') && tokens[i - 1]?.text !== ')') i--;
      break;
    }
    return tokens.slice(i + 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers

function matching(tokens: Token[], open: number) {
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const opener = tokens[open].text;
  let depth = 0;
  for (let j = open; j < tokens.length; j++) {
    if (tokens[j].text === opener) depth++;
    else if (tokens[j].text === pairs[opener] && --depth === 0) return j;
  }
  return tokens.length - 1;
}

function matchingBackward(tokens: Token[], close: number) {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const closer = tokens[close].text;
  let depth = 0;
  for (let j = close; j >= 0; j--) {
    if (tokens[j].text === closer) depth++;
    else if (tokens[j].text === pairs[closer] && --depth === 0) return j;
  }
  return 0;
}

/** Tokens of a statement: up to a newline (or `stop`) at depth 0. */
function statement(tokens: Token[], start: number, stop?: string) {
  let depth = 0;
  let j = start;
  while (tokens[j]) {
    const text = tokens[j].text;
    if (depth === 0 && (tokens[j].kind === 'nl' || text === ';' || text === stop)) break;
    if (text === '(' || text === '[' || text === '{') depth++;
    if (text === ')' || text === ']' || text === '}') {
      if (depth === 0) break;
      depth--;
    }
    j++;
  }
  return tokens.slice(start, j).filter((token) => token.kind !== 'nl');
}

export function splitArguments(tokens: Token[]) {
  const parts: Token[][] = [];
  let depth = 0;
  let current: Token[] = [];
  for (const token of tokens) {
    if (token.kind === 'nl') continue;
    if (token.text === '(' || token.text === '[' || token.text === '{') depth++;
    if (token.text === ')' || token.text === ']' || token.text === '}') depth--;
    if (token.text === ',' && depth === 0) {
      parts.push(current);
      current = [];
    } else current.push(token);
  }
  if (current.length) parts.push(current);
  return parts;
}

function splitLines(tokens: Token[]) {
  const lines: Token[][] = [];
  let current: Token[] = [];
  for (const token of tokens) {
    if (token.kind === 'nl' || token.text === ';') {
      if (current.length) lines.push(current);
      current = [];
    } else current.push(token);
  }
  if (current.length) lines.push(current);
  return lines;
}
