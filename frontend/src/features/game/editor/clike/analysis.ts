// A small analyser for C-like battle solutions (C++, Java; the language comes as a Profile):
// enough type inference to complete `a.`, `it->`, `std::`, `Math.` and calls of the library
// (../cpp/stdlib, ../java/library) and of the file's own structs/classes and functions. It reads
// declarations (`vector<int> a`, `List<Integer> xs = new ArrayList<>()`, parameters, range-for,
// structured bindings, `auto`/`var x = expr`, `using`/`typedef`/`#define` aliases) and evaluates
// postfix expressions; no scopes beyond "the nearest declaration before the cursor". No Monaco.

/** A library type: its members as `name(params): Return — doc` / `name: Type — doc`. */
export interface StdType {
  /** Template parameter names, matched to the template arguments by position. */
  params: string[];
  members: string[];
  /** What `x[i]` gives. */
  index?: string;
  /** What `for (auto& e : x)` and structured bindings over it give. */
  element?: string;
  /** What `*x` and `x->` give. */
  deref?: string;
  doc: string;
}

export interface Profile {
  types: Record<string, StdType>;
  /** Free functions (C++). */
  functions: string[];
  /** Free objects and constants: `name: Type — doc`. */
  values: string[];
  /** Static members by class (Java's `Math.max`, `Integer.MAX_VALUE`), same entry format. */
  statics: Record<string, string[]>;
  primitives: Set<string>;
  /** Types the analyser knows by name only. */
  otherTypes: Set<string>;
  /** `std` for C++. */
  namespace?: string;
  /** Whether `->` accesses members (C++) rather than being a lambda arrow (Java). */
  arrowMember: boolean;
  stringType: string;
  /** Members of built-in arrays (Java's `length`). */
  arrayMembers: string[];
  /** D: `V[K]` associative arrays, `T[n]` static arrays, `[1, 2]` / `["a": 1]` literals, foreach. */
  dArrays?: boolean;
  /** D: a method without arguments is called without parentheses (`arr.sum`, `.array`). */
  optionalParens?: boolean;
}

export interface Type {
  name: string;
  args: Type[];
}

export interface Signature {
  name: string;
  params: string[];
  /** Unresolved return type text (stdlib) or resolved type (the file's functions). */
  returns: string | Type | undefined;
  doc?: string;
  label: string;
}

export interface Member {
  name: string;
  kind: 'method' | 'field';
  /** Field type or method return type, with the receiver's template arguments filled in. */
  type: Type | undefined;
  signatures: Signature[];
  doc?: string;
}

interface Token {
  text: string;
  kind: 'id' | 'num' | 'str' | 'char' | 'punct';
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------------------------
// Tokens

const PUNCTUATION = ['->*', '<<=', '>>=', '...', '..', '=>', '~=', '^^', '::', '->', '++', '--', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<'];

export function tokenize(source: string): { tokens: Token[]; defines: Map<string, string> } {
  const tokens: Token[] = [];
  const defines = new Map<string, string>();
  let i = 0;
  const n = source.length;
  let lineStart = true;
  while (i < n) {
    const c = source[i];
    if (c === '\n') {
      lineStart = true;
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '#' && lineStart) {
      let end = i;
      while (end < n && source[end] !== '\n') end += source[end] === '\\' && source[end + 1] === '\n' ? 2 : 1;
      const define = /^#\s*define\s+([A-Za-z_]\w*)\s+(.+)$/.exec(source.slice(i, end).trim());
      if (define) defines.set(define[1], define[2].trim());
      i = end;
      continue;
    }
    lineStart = false;
    if (c === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    const start = i;
    if (c === '"' || c === "'") {
      i++;
      while (i < n && source[i] !== c && source[i] !== '\n') i += source[i] === '\\' ? 2 : 1;
      i++;
      tokens.push({ text: source.slice(start, Math.min(i, n)), kind: c === '"' ? 'str' : 'char', start, end: Math.min(i, n) });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      while (i < n && /\w/.test(source[i])) i++;
      tokens.push({ text: source.slice(start, i), kind: 'id', start, end: i });
      continue;
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(source[i + 1] ?? ''))) {
      while (i < n && /[\w.']/.test(source[i])) i++;
      tokens.push({ text: source.slice(start, i), kind: 'num', start, end: i });
      continue;
    }
    // `>>` stays two tokens so nested template arguments close one at a time.
    const op = PUNCTUATION.find((candidate) => source.startsWith(candidate, i));
    const text = op ?? c;
    i += text.length;
    tokens.push({ text, kind: 'punct', start, end: i });
  }
  return { tokens, defines };
}

// ---------------------------------------------------------------------------------------------
// Types

const QUALIFIERS = new Set([
  'const', 'static', 'constexpr', 'inline', 'mutable', 'volatile', 'register', 'typename', 'extern', 'thread_local',
  'final', 'public', 'private', 'protected', 'abstract', 'synchronized', 'transient',
  'immutable', 'shared', 'scope', 'ref', 'enum',
]);

export const type = (name: string, args: Type[] = []): Type => ({ name, args });

/** C++'s `auto`, Java's `var`: the type comes from the initializer. */
const inferred = (t: Type) => t.name === 'auto' || t.name === 'var';

export function typeToString(t: Type | undefined): string {
  if (!t) return '?';
  if (t.name === '*') return `${typeToString(t.args[0])}*`;
  if (t.name === '[]') return `${typeToString(t.args[0])}[]`;
  if (t.name === 'aa') return `${typeToString(t.args[1])}[${typeToString(t.args[0])}]`;
  return t.args.length ? `${t.name}<${t.args.map(typeToString).join(', ')}>` : t.name;
}

/** `long long int` → `long long`, `unsigned int` → `unsigned`. */
function primitiveName(words: string[]) {
  const name = words.filter((word) => !(word === 'int' && words.length > 1) && word !== 'signed').join(' ');
  return name || 'int';
}

// ---------------------------------------------------------------------------------------------
// Declarations

type Lazy =
  | { kind: 'type'; type: Type | undefined }
  | { kind: 'expr'; tokens: Token[] }
  | { kind: 'element'; tokens: Token[] }
  | { kind: 'binding'; of: Lazy; index: number }
  | { kind: 'foreach'; tokens: Token[]; index: number; count: number };

interface Variable {
  name: string;
  /** Offset of the name: visible after it. */
  at: number;
  value: Lazy;
}

interface UserFunction {
  name: string;
  returns: Type | undefined;
  params: string[];
  at: number;
}

interface UserStruct {
  name: string;
  fields: Variable[];
  methods: UserFunction[];
}

export class Analysis {
  readonly tokens: Token[];
  readonly variables: Variable[] = [];
  readonly functions = new Map<string, UserFunction>();
  readonly structs = new Map<string, UserStruct>();
  private readonly aliases = new Map<string, Type>();
  private readonly defines: Map<string, string>;
  private depth = 0;

  readonly profile: Profile;

  constructor(source: string, profile: Profile) {
    this.profile = profile;
    const { tokens, defines } = tokenize(source);
    this.tokens = tokens;
    this.defines = defines;
    this.collectAliasesFromDefines();
    this.scan();
  }

  // --- type parsing ------------------------------------------------------------------------

  isTypeName(name: string) {
    return (
      this.profile.primitives.has(name) ||
      this.profile.otherTypes.has(name) ||
      name in this.profile.types ||
      this.structs.has(name) ||
      this.aliases.has(name)
    );
  }

  /** Parses a type at tokens[i]; null when there is none. */
  parseType(tokens: Token[], i: number): { type: Type; next: number } | null {
    let j = i;
    while (tokens[j] && QUALIFIERS.has(tokens[j].text)) j++;
    // D's `immutable n = …`: a storage class alone infers the type.
    if (j > i && tokens[j]?.kind === 'id' && !this.isTypeName(tokens[j].text) && tokens[j + 1]?.text === '=') return { type: type('auto'), next: j };
    if (this.profile.namespace && tokens[j]?.text === this.profile.namespace && tokens[j + 1]?.text === '::') j += 2;
    // Map.Entry: a nested type is named by its last part.
    while (tokens[j]?.kind === 'id' && tokens[j + 1]?.text === '.' && this.isTypeName(tokens[j].text) && this.isTypeName(tokens[j + 2]?.text ?? '')) j += 2;
    const first = tokens[j];
    if (!first || first.kind !== 'id') return null;

    let result: Type;
    if (this.profile.primitives.has(first.text)) {
      const words: string[] = [];
      while (tokens[j] && this.profile.primitives.has(tokens[j].text)) words.push(tokens[j++].text);
      result = type(primitiveName(words));
    } else if (this.isTypeName(first.text)) {
      j++;
      const args: Type[] = [];
      if (tokens[j]?.text === '<') {
        j++;
        while (tokens[j] && tokens[j].text !== '>') {
          const arg = this.parseType(tokens, j);
          if (arg) {
            args.push(arg.type);
            j = arg.next;
          } else {
            // A non-type argument (array<int, 26>, bitset<N + 1>): keep its text.
            const start = j;
            let depth = 0;
            while (tokens[j] && !(depth === 0 && (tokens[j].text === ',' || tokens[j].text === '>'))) {
              if (tokens[j].text === '(' || tokens[j].text === '<') depth++;
              if (tokens[j].text === ')' || tokens[j].text === '>') depth--;
              j++;
            }
            args.push(type(tokens.slice(start, j).map((token) => token.text).join('')));
          }
          if (tokens[j]?.text === ',') j++;
        }
        if (tokens[j]?.text !== '>') return null;
        j++;
      }
      const alias = this.aliases.get(first.text);
      result = alias && !args.length ? alias : type(first.text, args);
      // vector<int>::iterator
      if (tokens[j]?.text === '::' && /^(const_)?(reverse_)?iterator$/.test(tokens[j + 1]?.text ?? '')) {
        result = type('iterator', [this.elementOf(result) ?? type('?')]);
        j += 2;
      }
    } else {
      return null;
    }
    for (;;) {
      const text = tokens[j]?.text;
      if (text === 'const' || text === '&' || text === '&&') j++;
      else if (text === '*') {
        result = type('*', [result]);
        j++;
      } else if (text === '[' && tokens[j + 1]?.text === ']') {
        // Java's and D's int[], int[][]
        result = type('[]', [result]);
        j += 2;
      } else if (text === '[' && this.profile.dArrays) {
        // D: long[string] (associative), int[26] (static)
        const key = this.parseType(tokens, j + 1);
        if (key && tokens[key.next]?.text === ']') {
          result = type('aa', [key.type, result]);
          j = key.next + 1;
        } else {
          result = type('[]', [result]);
          j = this.matching(tokens, j) + 1;
        }
      } else break;
    }
    return { type: result, next: j };
  }

  parseTypeText(text: string, bindings?: Map<string, Type>, args?: Type[]): Type | undefined {
    const tokens = tokenize(text.replace(/\$(\d)/g, '__arg$1')).tokens;
    const substitute = (t: Type): Type | undefined => {
      const argument = /^__arg(\d)$/.exec(t.name);
      if (argument) return args?.[Number(argument[1])];
      const bound = bindings?.get(t.name);
      if (bound && !t.args.length) return bound;
      return type(t.name, t.args.map((inner) => substitute(inner) ?? type('?')));
    };
    // Template parameters and placeholders parse as names: make them types while parsing (over
    // any alias of the same name in the file), then put the file's aliases back.
    const extra = [...(bindings?.keys() ?? []), ...tokens.filter((token) => token.text.startsWith('__arg')).map((token) => token.text)];
    const saved = new Map(extra.map((name) => [name, this.aliases.get(name)] as const));
    for (const name of extra) this.aliases.set(name, type(name));
    try {
      const parsed = this.parseType(tokens, 0);
      return parsed ? substitute(parsed.type) : undefined;
    } finally {
      for (const [name, alias] of saved) {
        if (alias) this.aliases.set(name, alias);
        else this.aliases.delete(name);
      }
    }
  }

  private collectAliasesFromDefines() {
    for (const [name, body] of this.defines) {
      const tokens = tokenize(body).tokens;
      const parsed = this.parseType(tokens, 0);
      if (parsed && parsed.next === tokens.length) this.aliases.set(name, parsed.type);
    }
  }

  // --- declaration scan --------------------------------------------------------------------

  private scan() {
    const tokens = this.tokens;
    // Structs first, so their names parse as types anywhere in the file.
    for (let i = 0; i < tokens.length - 1; i++) {
      if ((tokens[i].text === 'struct' || tokens[i].text === 'class') && tokens[i + 1].kind === 'id') {
        this.structs.set(tokens[i + 1].text, { name: tokens[i + 1].text, fields: [], methods: [] });
      }
    }

    const braces: (UserStruct | null)[] = [];
    let parens = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.text === '{') {
        const owner = tokens[i - 1]?.kind === 'id' && /^(struct|class)$/.test(tokens[i - 2]?.text ?? '') ? this.structs.get(tokens[i - 1].text) : undefined;
        braces.push(owner ?? null);
        continue;
      }
      if (token.text === '}') {
        braces.pop();
        continue;
      }
      // D: foreach (i, ref x; arr)   foreach (i; 0 .. n)
      if ((token.text === 'foreach' || token.text === 'foreach_reverse') && tokens[i + 1]?.text === '(') {
        const close = this.matching(tokens, i + 1);
        const semicolon = tokens.findIndex((candidate, index) => index > i + 1 && index < close && candidate.text === ';');
        if (semicolon > 0) {
          const params = this.splitArguments(tokens.slice(i + 2, semicolon));
          const expression = tokens.slice(semicolon + 1, close);
          params.forEach((param, index) => {
            const name = param.at(-1);
            if (name?.kind !== 'id') return;
            const explicit = param.length > 1 ? this.parseType(param, 0) : null;
            const value: Lazy = explicit && !inferred(explicit.type) && explicit.next === param.length - 1 ? { kind: 'type', type: explicit.type } : { kind: 'foreach', tokens: expression, index, count: params.length };
            this.variables.push({ name: name.text, at: name.start, value });
          });
          i = semicolon;
          continue;
        }
      }
      if (token.text === '(') parens++;
      if (token.text === ')') parens = Math.max(0, parens - 1);
      const inStruct = parens === 0 ? (braces.at(-1) ?? undefined) : undefined;

      if (token.text === 'using' && tokens[i + 1]?.kind === 'id' && tokens[i + 2]?.text === '=') {
        const parsed = this.parseType(tokens, i + 3);
        if (parsed) this.aliases.set(tokens[i + 1].text, parsed.type);
        continue;
      }
      if (token.text === 'typedef') {
        const parsed = this.parseType(tokens, i + 1);
        if (parsed && tokens[parsed.next]?.kind === 'id') this.aliases.set(tokens[parsed.next].text, parsed.type);
        continue;
      }
      if (token.kind !== 'id' || !this.startsType(tokens, i)) continue;
      // Not a declaration after `.`/`->`; after `::` it was handled at `std` (or is a scoped name).
      const before = tokens[i - 1]?.text;
      if (before === '.' || before === '->' || before === '::') continue;
      const parsed = this.parseType(tokens, i);
      if (!parsed) continue;
      const consumed = this.declaration(tokens, i, parsed.type, parsed.next, inStruct, parens > 0);
      if (consumed > i) i = consumed - 1;
    }
  }

  private startsType(tokens: Token[], i: number) {
    const text = tokens[i].text;
    if (this.profile.namespace && text === this.profile.namespace) return tokens[i + 1]?.text === '::' && this.isTypeName(tokens[i + 2]?.text ?? '');
    if (QUALIFIERS.has(text)) {
      const next = tokens[i + 1];
      return this.isTypeName(next?.text ?? '') || next?.text === 'std' || QUALIFIERS.has(next?.text ?? '') || (next?.kind === 'id' && tokens[i + 2]?.text === '=');
    }
    return this.isTypeName(text);
  }

  /** Records the declaration(s) after a type; returns where scanning continues. */
  private declaration(tokens: Token[], typeStart: number, declared: Type, next: number, owner: UserStruct | undefined, inParens: boolean): number {
    let j = next;
    // Structured binding: auto [a, b] = expr;  for (auto& [k, v] : m)
    if (tokens[j]?.text === '[' && inferred(declared)) {
      const names: Token[] = [];
      j++;
      while (tokens[j] && tokens[j].text !== ']') {
        if (tokens[j].kind === 'id') names.push(tokens[j]);
        j++;
      }
      j++;
      const separator = tokens[j]?.text;
      if (separator !== '=' && separator !== ':') return j;
      const expression = this.expressionUntil(tokens, j + 1, separator === ':' ? [')'] : [';']);
      const of: Lazy = separator === ':' ? { kind: 'element', tokens: expression.tokens } : { kind: 'expr', tokens: expression.tokens };
      names.forEach((name, index) => this.variables.push({ name: name.text, at: name.start, value: { kind: 'binding', of, index } }));
      return expression.end;
    }

    const name = tokens[j];
    if (!name || name.kind !== 'id' || this.isTypeName(name.text) || QUALIFIERS.has(name.text)) return typeStart + 1;
    const after = tokens[j + 1]?.text;
    if (!after || ![';', '=', ',', '(', '{', '[', ')', ':'].includes(after)) return typeStart + 1;

    if (after === '(') {
      const close = this.matching(tokens, j + 1);
      const following = tokens[close + 1]?.text;
      if (following === '{' || following === 'const' || following === 'override' || following === 'noexcept' || following === '->') {
        const fn: UserFunction = { name: name.text, returns: inferred(declared) ? undefined : declared, params: this.splitParams(tokens.slice(j + 2, close)), at: name.start };
        // Methods are also callable unqualified (from the class's other methods).
        if (owner) owner.methods.push(fn);
        if (!owner || !this.functions.has(name.text)) this.functions.set(name.text, fn);
        return j + 1; // the parameters are declarations too
      }
    }

    let current: Token = name;
    let k = j + 1;
    for (;;) {
      let value: Lazy = { kind: 'type', type: declared };
      if (tokens[k]?.text === '[') {
        // int a[100], g[N][M]
        let arrayType = declared;
        while (tokens[k]?.text === '[') {
          arrayType = type('[]', [arrayType]);
          k = this.matching(tokens, k) + 1;
        }
        value = { kind: 'type', type: arrayType };
      }
      if (tokens[k]?.text === ':' && declared.name !== '?') {
        // for (auto& x : v)
        const expression = this.expressionUntil(tokens, k + 1, [')']);
        this.addVariable(current, inferred(declared) ? { kind: 'element', tokens: expression.tokens } : value, owner);
        return expression.end;
      }
      if (tokens[k]?.text === '=' || tokens[k]?.text === '(' || tokens[k]?.text === '{') {
        const opener = tokens[k].text;
        let end: number;
        let initializer: Token[];
        if (opener === '=') {
          const expression = this.expressionUntil(tokens, k + 1, [';', ',', ')']);
          initializer = expression.tokens;
          // A lambda (or any braced initializer) has declarations of its own: scan into it.
          if (initializer.some((token) => token.text === '{')) {
            this.addVariable(current, inferred(declared) ? { kind: 'expr', tokens: initializer } : value, owner);
            return k + 1;
          }
          end = expression.end;
        } else {
          end = this.matching(tokens, k) + 1;
          initializer = [];
        }
        this.addVariable(current, inferred(declared) && opener === '=' ? { kind: 'expr', tokens: initializer } : value, owner);
        k = end;
      } else {
        this.addVariable(current, value, owner);
      }
      // int a, b = 2, c;   (not in parameter lists, where each parameter has its own type)
      if (!inParens && tokens[k]?.text === ',' && tokens[k + 1]?.kind === 'id' && !this.isTypeName(tokens[k + 1].text)) {
        while (tokens[k + 1]?.text === '*' || tokens[k + 1]?.text === '&') k++;
        current = tokens[k + 1];
        k += 2;
        continue;
      }
      return k;
    }
  }

  private addVariable(name: Token, value: Lazy, owner: UserStruct | undefined) {
    const variable = { name: name.text, at: name.start, value };
    if (owner) owner.fields.push(variable);
    else this.variables.push(variable);
  }

  /** Tokens from `start` up to the first stop token at depth 0. */
  private expressionUntil(tokens: Token[], start: number, stops: string[]) {
    let depth = 0;
    let j = start;
    while (tokens[j]) {
      const text = tokens[j].text;
      if (depth === 0 && stops.includes(text)) break;
      if (text === '(' || text === '[' || text === '{') depth++;
      if (text === ')' || text === ']' || text === '}') {
        if (depth === 0) break;
        depth--;
      }
      j++;
    }
    return { tokens: tokens.slice(start, j), end: j };
  }

  /** Index of the bracket closing the one at `open` (or the last token). */
  matching(tokens: Token[], open: number) {
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };
    const close = pairs[tokens[open]?.text];
    let depth = 0;
    for (let j = open; j < tokens.length; j++) {
      if (tokens[j].text === tokens[open].text) depth++;
      else if (tokens[j].text === close && --depth === 0) return j;
    }
    return tokens.length - 1;
  }

  /** Splits a parameter/argument list at top-level commas. */
  splitParams(tokens: Token[]) {
    const parts: string[] = [];
    let depth = 0;
    let current: string[] = [];
    for (const token of tokens) {
      if (token.text === '(' || token.text === '<' || token.text === '[' || token.text === '{') depth++;
      if (token.text === ')' || token.text === '>' || token.text === ']' || token.text === '}') depth--;
      if (token.text === ',' && depth === 0) {
        parts.push(current.join(' '));
        current = [];
      } else {
        current.push(token.text);
      }
    }
    if (current.length) parts.push(current.join(' '));
    return parts.map((part) => part.replace(/\s*([<>,:*&[\]()])\s*/g, '$1').replace(/([*&])(\w)/g, '$1 $2').trim()).filter(Boolean);
  }

  private splitArguments(tokens: Token[]) {
    const parts: Token[][] = [];
    let depth = 0;
    let current: Token[] = [];
    for (const token of tokens) {
      if (token.text === '(' || token.text === '[' || token.text === '{') depth++;
      if (token.text === ')' || token.text === ']' || token.text === '}') depth--;
      if (token.text === ',' && depth === 0) {
        parts.push(current);
        current = [];
      } else {
        current.push(token);
      }
    }
    if (current.length) parts.push(current);
    return parts;
  }

  // --- lookups -----------------------------------------------------------------------------

  /** The nearest declaration of `name` before `offset`. */
  variable(name: string, offset: number) {
    let found: Variable | undefined;
    for (const variable of this.variables) if (variable.name === name && variable.at < offset && (!found || variable.at > found.at)) found = variable;
    return found;
  }

  /** Variables declared before `offset`, the nearest declaration of each name. */
  visibleVariables(offset: number) {
    const byName = new Map<string, Variable>();
    for (const variable of this.variables) {
      if (variable.at >= offset) continue;
      const seen = byName.get(variable.name);
      if (!seen || variable.at > seen.at) byName.set(variable.name, variable);
    }
    return [...byName.values()];
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
          return container && this.elementOf(container);
        }
        case 'binding': {
          const whole = this.resolve(value.of, offset);
          return whole && this.bindingOf(whole, value.index);
        }
        case 'foreach': {
          const at = value.tokens[0]?.start ?? offset;
          const range = value.tokens.findIndex((token) => token.text === '..');
          if (range > 0) return this.evaluate(value.tokens.slice(0, range), at) ?? type('int');
          const over = this.evaluate(value.tokens, at);
          if (value.count === 2 && value.index === 0) return over?.name === 'aa' ? over.args[0] : type('size_t');
          return over && this.elementOf(over);
        }
      }
    } finally {
      this.depth--;
    }
  }

  typeOfVariable(name: string, offset: number) {
    const variable = this.variable(name, offset);
    return variable && this.resolve(variable.value, variable.at);
  }

  private bindings(t: Type) {
    const std = this.profile.types[t.name];
    const bindings = new Map((std?.params ?? []).map((param, index) => [param, t.args[index] ?? type('?')] as const));
    bindings.set('Self', t);
    return bindings;
  }

  private stdTypeText(t: Type, text: string | undefined) {
    return text ? this.parseTypeText(text, this.bindings(t)) : undefined;
  }

  elementOf(t: Type): Type | undefined {
    if (t.name === '[]' || t.name === '*') return t.args[0];
    return this.stdTypeText(t, this.profile.types[t.name]?.element);
  }

  indexOf(t: Type): Type | undefined {
    if (t.name === '[]' || t.name === '*') return t.args[0];
    return this.stdTypeText(t, this.profile.types[t.name]?.index);
  }

  derefOf(t: Type): Type | undefined {
    if (t.name === '*' || t.name === 'iterator') return t.args[0];
    return undefined;
  }

  bindingOf(t: Type, index: number): Type | undefined {
    if (t.name === 'pair' || t.name === 'tuple') return t.args[index];
    if (t.name === '[]' || t.name === 'array') return t.args[0];
    const struct = this.structs.get(t.name);
    const field = struct?.fields[index];
    return field && this.resolve(field.value, field.at);
  }

  /** Members of a type (`.`); for `->` pass the dereferenced type. */
  members(t: Type): Member[] {
    const struct = this.structs.get(t.name);
    if (struct) {
      return [
        ...struct.fields.map((field): Member => ({ name: field.name, kind: 'field', type: this.resolve(field.value, field.at), signatures: [] })),
        ...struct.methods.map(
          (method): Member => ({
            name: method.name,
            kind: 'method',
            type: method.returns,
            signatures: [{ name: method.name, params: method.params, returns: method.returns, label: `${method.name}(${method.params.join(', ')})` }],
          }),
        ),
      ];
    }
    const std = this.profile.types[t.name];
    const entries = t.name === '[]' && !std ? this.profile.arrayMembers : std?.members;
    if (!entries) return [];
    const bindings = this.bindings(t);
    return this.entryMembers(entries, bindings);
  }

  /** `Math.`, `Integer.`: a class's static members. */
  staticMembers(owner: string): Member[] {
    return this.entryMembers(this.profile.statics[owner] ?? [], new Map());
  }

  private entryMembers(entries: string[], bindings: Map<string, Type>): Member[] {
    const byName = new Map<string, Member>();
    for (const entry of entries) {
      const parsed = parseEntry(entry);
      if (!parsed) continue;
      const returns = this.parseTypeText(parsed.returns, bindings);
      const member = byName.get(parsed.name) ?? { name: parsed.name, kind: parsed.params ? 'method' : 'field', type: returns, signatures: [], doc: parsed.doc };
      if (parsed.params) {
        const params = parsed.params.map((param) => substituteText(param, bindings));
        member.signatures.push({ name: parsed.name, params, returns: parsed.returns.includes('$') ? parsed.returns : (returns ?? parsed.returns), doc: parsed.doc, label: `${parsed.name}(${params.join(', ')})` });
      }
      byName.set(parsed.name, member);
    }
    return [...byName.values()];
  }

  // --- expressions -------------------------------------------------------------------------

  /** The type of an expression (its leading postfix expression). */
  evaluate(tokens: Token[], offset: number): Type | undefined {
    const result = this.unary(tokens, 0, offset);
    return result?.type;
  }

  private unary(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const token = tokens[i];
    if (!token) return undefined;
    if (token.text === '*') {
      const inner = this.unary(tokens, i + 1, offset);
      return inner && { type: inner.type && this.derefOf(inner.type), next: inner.next };
    }
    if (token.text === '&' || token.text === '-' || token.text === '+' || token.text === '++' || token.text === '--' || token.text === '~') {
      return this.unary(tokens, i + 1, offset);
    }
    if (token.text === '!') {
      const inner = this.unary(tokens, i + 1, offset);
      return { type: type('bool'), next: inner?.next ?? i + 1 };
    }
    return this.postfix(tokens, i, offset);
  }

  private postfix(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const primary = this.primary(tokens, i, offset);
    if (!primary) return undefined;
    let { type: current, next: j } = primary;
    while (tokens[j]) {
      const text = tokens[j].text;
      if ((text === '.' || (text === '->' && this.profile.arrowMember)) && tokens[j + 1]?.kind === 'id') {
        const receiver = text === '->' ? current && this.derefOf(current) : current;
        const name = tokens[j + 1].text;
        const member = receiver && this.members(receiver).find((candidate) => candidate.name === name);
        j += 2;
        const template = this.templateArgument(tokens, j);
        j = template.next;
        if (tokens[j]?.text === '(') {
          const close = this.matching(tokens, j);
          current = member?.signatures.length ? this.callResult(member.signatures, tokens.slice(j + 1, close), offset, template.type) ?? member.type : undefined;
          j = close + 1;
        } else if (member?.kind === 'method' && this.profile.optionalParens) {
          current = this.callResult(member.signatures, [], offset, template.type) ?? member.type;
        } else {
          current = member?.kind === 'field' ? member.type : undefined;
        }
        continue;
      }
      if (text === '[') {
        current = current && this.indexOf(current);
        j = this.matching(tokens, j) + 1;
        continue;
      }
      if (text === '++' || text === '--') {
        j++;
        continue;
      }
      break;
    }
    return { type: current, next: j };
  }

  private primary(tokens: Token[], i: number, offset: number): { type: Type | undefined; next: number } | undefined {
    const token = tokens[i];
    if (!token) return undefined;
    if (token.kind === 'num') return { type: type(/[.eE]/.test(token.text) && !/^0x/i.test(token.text) ? 'double' : /ll$/i.test(token.text) ? 'long long' : 'int'), next: i + 1 };
    if (token.kind === 'str') return { type: type(this.profile.stringType), next: i + 1 };
    if (token.kind === 'char') return { type: type('char'), next: i + 1 };
    if (token.text === '[' && this.profile.dArrays) {
      // [1, 2, 3]   ["a": 1]
      const close = this.matching(tokens, i);
      const first = this.splitArguments(tokens.slice(i + 1, close))[0] ?? [];
      const colon = first.findIndex((part) => part.text === ':');
      const literal =
        colon > 0
          ? type('aa', [this.evaluate(first.slice(0, colon), offset) ?? type('?'), this.evaluate(first.slice(colon + 1), offset) ?? type('?')])
          : type('[]', [this.evaluate(first, offset) ?? type('?')]);
      return { type: literal, next: close + 1 };
    }
    if (token.text === '(') {
      const close = this.matching(tokens, i);
      const cast = this.parseType(tokens, i + 1);
      if (cast && cast.next === close && tokens[close + 1]) {
        const operand = this.unary(tokens, close + 1, offset);
        return { type: cast.type, next: operand?.next ?? close + 1 };
      }
      return { type: this.evaluate(tokens.slice(i + 1, close), offset), next: close + 1 };
    }
    if (token.kind !== 'id') return undefined;
    if (token.text === 'true' || token.text === 'false') return { type: type('bool'), next: i + 1 };

    let j = i;
    if (this.profile.namespace && token.text === this.profile.namespace && tokens[i + 1]?.text === '::') j = i + 2;
    const name = tokens[j];
    if (!name || name.kind !== 'id') return undefined;

    // new ArrayList<>(), new int[n], new int[]{1, 2}
    if (name.text === 'new') {
      const parsed = this.parseType(tokens, j + 1);
      if (!parsed) return undefined;
      let created = parsed.type;
      let k = parsed.next;
      while (tokens[k]?.text === '[') {
        created = type('[]', [created]);
        k = this.matching(tokens, k) + 1;
      }
      if (tokens[k]?.text === '(' || tokens[k]?.text === '{') k = this.matching(tokens, k) + 1;
      return { type: created, next: k };
    }

    // Math.max(a, b), Integer.MAX_VALUE: a class's static member (unless a variable has the name).
    if (this.profile.statics[name.text] && tokens[j + 1]?.text === '.' && tokens[j + 2]?.kind === 'id' && !this.variable(name.text, offset)) {
      const member = this.staticMembers(name.text).find((candidate) => candidate.name === tokens[j + 2].text);
      if (tokens[j + 3]?.text === '(') {
        const close = this.matching(tokens, j + 3);
        return { type: member?.signatures.length ? this.callResult(member.signatures, tokens.slice(j + 4, close), offset) : undefined, next: close + 1 };
      }
      return { type: member?.kind === 'field' ? member.type : undefined, next: j + 3 };
    }

    // static_cast<T>(x), get<I>(t)
    if (tokens[j + 1]?.text === '<' && /^(static_cast|reinterpret_cast|const_cast|get)$/.test(name.text)) {
      const close = this.matching(tokens, j + 1);
      if (tokens[close + 1]?.text === '(') {
        const end = this.matching(tokens, close + 1);
        if (name.text === 'get') {
          const index = Number(tokens[j + 2]?.text);
          const tuple = this.evaluate(tokens.slice(close + 2, end), offset);
          return { type: tuple && Number.isInteger(index) ? this.bindingOf(tuple, index) : undefined, next: end + 1 };
        }
        return { type: this.parseType(tokens, j + 2)?.type, next: end + 1 };
      }
    }

    // A temporary: vector<int>(n), pair<int, int>{a, b}
    if (this.isTypeName(name.text) && !this.profile.primitives.has(name.text)) {
      const parsed = this.parseType(tokens, j);
      if (parsed && (tokens[parsed.next]?.text === '(' || tokens[parsed.next]?.text === '{')) {
        return { type: parsed.type, next: this.matching(tokens, parsed.next) + 1 };
      }
    }

    const template = this.templateArgument(tokens, j + 1);
    if (tokens[template.next]?.text === '(') {
      const close = this.matching(tokens, template.next);
      const args = tokens.slice(template.next + 1, close);
      const user = this.functions.get(name.text);
      if (user) return { type: user.returns, next: close + 1 };
      const signatures = functionSignatures(this.profile).get(name.text);
      return { type: signatures ? this.callResult(signatures, args, offset, template.type) : undefined, next: close + 1 };
    }

    const variable = this.typeOfVariable(name.text, offset);
    if (variable) return { type: variable, next: j + 1 };
    const value = libraryValues(this.profile).get(name.text);
    return { type: value ? this.parseTypeText(value.returns) : undefined, next: j + 1 };
  }

  /** D's template argument after a name: `to!int`, `to!(long[])`, `map!(a => a * 2)`. */
  private templateArgument(tokens: Token[], j: number): { type: Type | undefined; next: number } {
    if (tokens[j]?.text !== '!' || !this.profile.optionalParens) return { type: undefined, next: j };
    if (tokens[j + 1]?.text === '(') {
      const close = this.matching(tokens, j + 1);
      const parsed = this.parseType(tokens, j + 2);
      return { type: parsed?.next === close ? parsed.type : undefined, next: close + 1 };
    }
    const parsed = this.parseType(tokens, j + 1);
    return { type: parsed?.type, next: parsed ? parsed.next : j + 2 };
  }

  /** The return type of a call, picking the overload by argument count. */
  private callResult(signatures: Signature[], argumentTokens: Token[], offset: number, template?: Type): Type | undefined {
    const args = this.splitArguments(argumentTokens);
    const signature = signatures.find((candidate) => candidate.params.length === args.length) ?? signatures[0];
    if (!signature) return undefined;
    if (signature.returns === '$T') return template;
    if (typeof signature.returns !== 'string') return signature.returns;
    if (!signature.returns.includes('$')) return this.parseTypeText(signature.returns);
    const argTypes = args.map((arg) => this.evaluate(arg, offset) ?? type('?'));
    return this.parseTypeText(signature.returns, undefined, argTypes);
  }

  // --- cursor context ----------------------------------------------------------------------

  /** Tokens ending right before `offset`, minus the word being typed. */
  tokensBefore(offset: number) {
    let end = 0;
    while (end < this.tokens.length && this.tokens[end].end <= offset) end++;
    const before = this.tokens.slice(0, end);
    const last = before.at(-1);
    if (last && last.kind === 'id' && last.end === offset) before.pop();
    return before;
  }

  /** The postfix expression that ends at `tokens.at(-1)`. */
  expressionBefore(tokens: Token[]): Token[] {
    let i = tokens.length - 1;
    const openers: Record<string, string> = { ')': '(', ']': '[', '>': '<' };
    for (;;) {
      const token = tokens[i];
      if (!token) break;
      if (token.text in openers && (token.text !== '>' || tokens[i + 1]?.text === '(')) {
        // Walk back to the matching opener.
        let depth = 0;
        for (; i >= 0; i--) {
          if (tokens[i].text === token.text) depth++;
          else if (tokens[i].text === openers[token.text] && --depth === 0) break;
        }
        i--;
        // D: name!(args)(…) and name!(args)
        if (tokens[i]?.text === ')' && this.profile.optionalParens) {
          let depth = 0;
          for (; i >= 0; i--) {
            if (tokens[i].text === ')') depth++;
            else if (tokens[i].text === '(' && --depth === 0) break;
          }
          i--;
        }
        if (tokens[i]?.text === '!' && this.profile.optionalParens) i--;
        if (tokens[i]?.kind === 'id') i--;
      } else if (token.kind === 'id' || token.kind === 'num' || token.kind === 'str') {
        i--;
        // D: to!int
        if (tokens[i]?.text === '!' && tokens[i - 1]?.kind === 'id' && this.profile.optionalParens) i -= 2;
      } else {
        break;
      }
      const connector = tokens[i]?.text;
      if (connector === '.' || (connector === '->' && this.profile.arrowMember) || connector === '::') {
        i--;
        continue;
      }
      if (connector === '*' && !['id', 'num'].includes(tokens[i - 1]?.kind ?? '') && tokens[i - 1]?.text !== ')') i--;
      break;
    }
    return tokens.slice(i + 1);
  }
}

// ---------------------------------------------------------------------------------------------
// The stdlib tables, parsed once.

interface Entry {
  name: string;
  params: string[] | undefined;
  returns: string;
  doc?: string;
}

function parseEntry(entry: string): Entry | undefined {
  const name = /^\w+/.exec(entry)?.[0];
  if (!name) return undefined;
  let rest = entry.slice(name.length);
  let params: string[] | undefined;
  if (rest.startsWith('(')) {
    // Balanced, so a doc mentioning `f(x):` doesn't end the parameters.
    let depth = 0;
    let close = 0;
    for (; close < rest.length; close++) {
      if (rest[close] === '(') depth++;
      if (rest[close] === ')' && --depth === 0) break;
    }
    params = splitText(rest.slice(1, close));
    rest = rest.slice(close + 1);
  }
  const match = /^: (.+?)(?: — (.*))?$/.exec(rest);
  if (!match) return undefined;
  return { name, params, returns: match[1], doc: match[2] };
}

function splitText(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const c of text) {
    if (c === '<' || c === '(') depth++;
    if (c === '>' || c === ')') depth--;
    if (c === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function substituteText(text: string, bindings: Map<string, Type>) {
  return text.replace(/\b[A-Z]\b/g, (param) => (bindings.has(param) ? typeToString(bindings.get(param)) : param));
}

const functionsCache = new WeakMap<Profile, Map<string, Signature[]>>();
export function functionSignatures(profile: Profile) {
  let functions = functionsCache.get(profile);
  if (!functions) {
    functions = new Map();
    for (const entry of profile.functions) {
      const parsed = parseEntry(entry);
      if (!parsed?.params) continue;
      const list = functions.get(parsed.name) ?? [];
      list.push({ name: parsed.name, params: parsed.params, returns: parsed.returns, doc: parsed.doc, label: `${parsed.name}(${parsed.params.join(', ')})` });
      functions.set(parsed.name, list);
    }
    functionsCache.set(profile, functions);
  }
  return functions;
}

const valuesCache = new WeakMap<Profile, Map<string, Entry>>();
export function libraryValues(profile: Profile) {
  let values = valuesCache.get(profile);
  if (!values) {
    values = new Map();
    for (const entry of profile.values) {
      const parsed = parseEntry(entry);
      if (parsed) values.set(parsed.name, parsed);
    }
    valuesCache.set(profile, values);
  }
  return values;
}

/** Display text for a signature's return. */
export const returnText = (signature: Signature) =>
  typeof signature.returns === 'string' ? signature.returns.replace(/\$\d/g, 'auto') : typeToString(signature.returns);
