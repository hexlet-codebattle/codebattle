// A small PHP analyser for the editor: tokens, functions, scopes and variables with guessed
// types (from parameter hints, literals, casts and library return types). Types are strings:
// `int`, `string`, `array`, `string[]` (an array of strings), a class name or `mixed`.
import { PHP_CLASSES, PHP_CONSTANTS, PHP_FUNCTIONS } from './library';

export interface Token {
  kind: 'var' | 'id' | 'num' | 'str' | 'punct';
  text: string;
  start: number;
  end: number;
}

export interface Signature {
  name: string;
  params: string[];
  returns: string;
  label: string;
  doc?: string;
}

export interface Variable {
  name: string;
  type: string;
  at: number;
}

export interface UserFunction {
  name: string;
  params: string[];
  returns: string;
}

interface Scope {
  start: number;
  end: number;
  /** Arrow functions see the enclosing scope's variables; other functions don't. */
  inherits: boolean;
  parent?: Scope;
  variables: Map<string, Variable>;
}

const PUNCTUATION = ['<=>', '===', '!==', '**=', '...', '??=', '?->', '<<=', '>>=', '==', '!=', '<>', '<=', '>=', '&&', '||', '??', '->', '=>', '::', '++', '--', '+=', '-=', '*=', '/=', '.=', '%=', '**', '<<', '>>'];
const COMPARISON = new Set(['==', '!=', '===', '!==', '<>', '<', '>', '<=', '>=', '&&', '||', 'and', 'or', 'xor', 'instanceof']);
const CASTS: Record<string, string> = { int: 'int', integer: 'int', float: 'float', double: 'float', string: 'string', bool: 'bool', boolean: 'bool', array: 'array', object: 'object' };
const MODIFIERS = new Set(['public', 'private', 'protected', 'readonly', '&', '?']);
const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

export function parseEntry(entry: string): Signature & { doc?: string } {
  const [head, doc] = entry.split(' — ');
  const name = head.slice(0, head.indexOf('('));
  const close = head.indexOf(')');
  const inside = head.slice(name.length + 1, close);
  const returns = head.slice(close + 1).replace(/^:\s*/, '').trim();
  const params = inside ? splitTopLevel(inside) : [];
  return { name, params, returns, label: `${name}(${params.join(', ')})`, doc };
}

function splitTopLevel(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(' || text[i] === '[') depth++;
    else if (text[i] === ')' || text[i] === ']') depth--;
    else if (text[i] === ',' && depth === 0) {
      parts.push(text.slice(from, i).trim());
      from = i + 1;
    }
  }
  parts.push(text.slice(from).trim());
  return parts;
}

let functionTable: Map<string, Signature> | undefined;

/** The library functions by name. */
export function libraryFunctions() {
  if (!functionTable) {
    functionTable = new Map();
    for (const entry of PHP_FUNCTIONS) {
      const signature = parseEntry(entry);
      if (!functionTable.has(signature.name)) functionTable.set(signature.name, signature);
    }
  }
  return functionTable;
}

const classTables = new Map<string, Signature[]>();

/** The methods of a library class (`SplStack`), or undefined. */
export function classMembers(type: string) {
  const name = type.replace(/^[?\\]+/, '');
  const known = PHP_CLASSES[name];
  if (!known) return undefined;
  let members = classTables.get(name);
  if (!members) {
    members = known.members.map(parseEntry);
    classTables.set(name, members);
  }
  return members;
}

/** The element type of an array type: `string[]` → `string`. */
export function elementOf(type: string) {
  if (type.endsWith('[]')) return type.slice(0, -2);
  if (type === 'string') return 'string';
  return 'mixed';
}

export function tokenize(source: string) {
  const tokens: Token[] = [];
  const comments: [number, number, boolean][] = [];
  const pattern = (regex: RegExp, at: number) => {
    regex.lastIndex = at;
    return regex.exec(source)?.[0];
  };
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (source.startsWith('//', i) || (c === '#' && source[i + 1] !== '[')) {
      const newline = source.indexOf('\n', i);
      const end = newline === -1 ? source.length : newline;
      comments.push([i, end, true]);
      i = end;
      continue;
    }
    if (source.startsWith('/*', i)) {
      const close = source.indexOf('*/', i + 2);
      const end = close === -1 ? source.length : close + 2;
      comments.push([i, end, close === -1]);
      i = end;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== c) j += source[j] === '\\' ? 2 : 1;
      const end = Math.min(j + 1, source.length);
      tokens.push({ kind: 'str', text: source.slice(i, end), start: i, end });
      i = end;
      continue;
    }
    const variable = c === '$' ? pattern(/\$[A-Za-z_]\w*/y, i) : undefined;
    const word = variable ? undefined : pattern(/[A-Za-z_\\][\w\\]*/y, i);
    const number = variable || word ? undefined : pattern(/0[xXbB][\da-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?/y, i);
    const text = variable ?? word ?? number ?? PUNCTUATION.find((punctuation) => source.startsWith(punctuation, i)) ?? c;
    tokens.push({ kind: variable ? 'var' : word ? 'id' : number ? 'num' : 'punct', text, start: i, end: i + text.length });
    i += text.length;
  }
  return { tokens, comments };
}

export class Analysis {
  readonly tokens: Token[];
  readonly functions = new Map<string, UserFunction>();
  readonly classes = new Set<string>();
  private readonly comments: [number, number, boolean][];
  private readonly scopes: Scope[] = [];
  private readonly root: Scope;
  /** Token indexes of parameter and `use` lists (declared in the function's own scope). */
  private readonly declarations = new Set<number>();
  private readonly matching = new Map<number, number>();
  /** Function scopes by the index of their `function` / `fn` keyword. */
  private readonly scopeAt = new Map<number, Scope>();

  private readonly source: string;

  constructor(source: string) {
    this.source = source;
    ({ tokens: this.tokens, comments: this.comments } = tokenize(source));
    this.root = { start: 0, end: source.length + 1, inherits: false, variables: new Map() };
    this.matchBrackets();
    this.collectFunctions();
    this.collectVariables();
  }

  private matchBrackets() {
    const stack: number[] = [];
    this.tokens.forEach((token, index) => {
      if (token.kind !== 'punct') return;
      if (OPEN[token.text]) stack.push(index);
      else if (token.text === ')' || token.text === ']' || token.text === '}') {
        const open = stack.pop();
        if (open !== undefined) this.matching.set(open, index);
      }
    });
  }

  /** The index of the bracket closing tokens[index], or the last token. */
  private close(index: number) {
    return this.matching.get(index) ?? this.tokens.length - 1;
  }

  private collectFunctions() {
    const { tokens } = this;
    for (let k = 0; k < tokens.length; k++) {
      const keyword = tokens[k].kind === 'id' ? tokens[k].text.toLowerCase() : '';
      if (keyword === 'class' || keyword === 'interface' || keyword === 'enum' || keyword === 'trait') {
        if (tokens[k + 1]?.kind === 'id' && tokens[k - 1]?.text !== '::') this.classes.add(tokens[k + 1].text);
        continue;
      }
      if (keyword !== 'function' && keyword !== 'fn') continue;
      let j = k + 1;
      if (tokens[j]?.text === '&') j++;
      const name = tokens[j]?.kind === 'id' ? tokens[j].text : undefined;
      if (name) j++;
      if (tokens[j]?.text !== '(') continue;
      const paramsEnd = this.close(j);
      const params = this.parameters(j + 1, paramsEnd);
      for (let p = j; p <= paramsEnd; p++) this.declarations.add(p);
      let q = paramsEnd + 1;
      const uses: number[] = [];
      if (tokens[q]?.text.toLowerCase() === 'use' && tokens[q + 1]?.text === '(') {
        const usesEnd = this.close(q + 1);
        for (let p = q; p <= usesEnd; p++) {
          this.declarations.add(p);
          if (tokens[p].kind === 'var') uses.push(p);
        }
        q = usesEnd + 1;
      }
      let returns = '';
      if (tokens[q]?.text === ':') {
        const from = q + 1;
        while (q + 1 < tokens.length && !['{', '=>', ';'].includes(tokens[q + 1].text)) q++;
        returns = tokens
          .slice(from, q + 1)
          .map((token) => token.text)
          .join('');
        q++;
      }
      if (name && keyword === 'function' && !this.functions.has(name)) {
        this.functions.set(name, { name, params: params.map((param) => param.text), returns: returns || 'mixed' });
      }

      let scope: Scope | undefined;
      if (keyword === 'fn' && tokens[q]?.text === '=>') {
        scope = { start: tokens[q].end, end: this.statementEnd(q + 1), inherits: true, variables: new Map() };
      } else if (keyword === 'function' && tokens[q]?.text === '{') {
        scope = { start: tokens[q].start, end: tokens[this.close(q)].end, inherits: false, variables: new Map() };
      }
      if (!scope) continue;
      for (const param of params) if (param.variable) scope.variables.set(param.variable, { name: param.variable, type: param.type, at: scope.start });
      // `use ($x)` copies the outer variable; its type is filled in by collectVariables.
      for (const index of uses) scope.variables.set(tokens[index].text, { name: tokens[index].text, type: `use:${tokens[index].start}`, at: scope.start });
      this.scopes.push(scope);
      this.scopeAt.set(k, scope);
    }
    this.scopes.sort((a, b) => a.start - b.start || b.end - a.end);
    for (const scope of this.scopes) scope.parent = this.innermost(scope.start - 1, scope);
  }

  /** `(int $a, array $b = [], ...$rest)` between from and to (exclusive). */
  private parameters(from: number, to: number) {
    const params: { text: string; variable?: string; type: string }[] = [];
    let start = from;
    for (let i = from; i <= to; i++) {
      if (i < to && OPEN[this.tokens[i].text]) {
        i = this.close(i);
        continue;
      }
      if (i < to && this.tokens[i].text !== ',') continue;
      if (i > start) {
        const part = this.tokens.slice(start, i);
        const at = part.findIndex((token) => token.kind === 'var');
        const hint = part
          .slice(0, Math.max(at, 0))
          .filter((token) => token.text !== '&' && token.text !== '...' && !MODIFIERS.has(token.text.toLowerCase()))
          .map((token) => token.text)
          .join('');
        const spread = part.some((token) => token.text === '...');
        let type = hint || 'mixed';
        if (!hint && part[at + 1]?.text === '=') type = this.evaluate(start + at + 2, 0);
        if (spread) type = type === 'mixed' ? 'array' : `${type}[]`;
        params.push({ text: this.source.slice(part[0].start, part.at(-1)!.end).replace(/\s+/g, ' '), variable: part[at]?.text, type });
      }
      start = i + 1;
    }
    return params;
  }

  /** Where an arrow function's body ends: the `;`, `,` or closing bracket after it. */
  private statementEnd(from: number) {
    for (let i = from; i < this.tokens.length; i++) {
      const text = this.tokens[i].text;
      if (OPEN[text]) i = this.close(i);
      else if (text === ';' || text === ',' || text === ')' || text === ']' || text === '}') return this.tokens[i].start;
    }
    return this.source.length;
  }

  private innermost(offset: number, except?: Scope): Scope {
    let found = this.root;
    for (const scope of this.scopes) {
      if (scope !== except && scope.start <= offset && offset < scope.end && scope.start >= found.start) found = scope;
    }
    return found;
  }

  /** The scope new variables go into: arrow functions assign into their enclosing function. */
  private owner(offset: number) {
    let scope = this.innermost(offset);
    while (scope.inherits && scope.parent) scope = scope.parent;
    return scope;
  }

  private collectVariables() {
    const { tokens } = this;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.kind === 'id' && token.text.toLowerCase() === 'foreach' && tokens[i + 1]?.text === '(') {
        this.foreach(i + 1);
        continue;
      }
      const opened = this.scopeAt.get(i);
      // `use ($x)` copies the outer variable as it is where the closure is written.
      for (const variable of opened?.variables.values() ?? []) {
        if (!variable.type.startsWith('use:')) continue;
        const outer = opened?.parent && this.lookup(opened.parent, variable.name);
        variable.type = outer && !outer.type.startsWith('use:') ? outer.type : 'mixed';
      }
      if (token.kind !== 'var' || this.declarations.has(i) || token.text === '$this') continue;
      const scope = this.owner(token.start);
      const next = tokens[i + 1]?.text;
      let type: string | undefined;
      if (next === '=') type = this.evaluate(i + 2, token.start);
      else if (next === '[' && tokens[this.close(i + 1) + 1]?.text === '=') type = 'array';
      else if (next === '.=') type = 'string';
      // An arrow function's parameter is already visible; anything else assigned there belongs to the enclosing function.
      const known = this.variable(token.text, token.start) ?? scope.variables.get(token.text);
      if (!known) scope.variables.set(token.text, { name: token.text, type: type ?? 'mixed', at: token.start });
      else if (known.type === 'mixed' && type && type !== 'mixed') known.type = type;
    }
  }

  /** `foreach ($xs as $k => $v)`: the key and value variables. */
  private foreach(open: number) {
    const { tokens } = this;
    const end = this.close(open);
    const as = tokens.findIndex((token, index) => index > open && index < end && token.kind === 'id' && token.text.toLowerCase() === 'as');
    if (as === -1) return;
    const iterated = this.evaluate(open + 1, tokens[open].start);
    const parts = tokens.slice(as + 1, end);
    const arrow = parts.findIndex((token) => token.text === '=>');
    const define = (token: Token | undefined, type: string) => {
      if (token?.kind !== 'var') return;
      const scope = this.owner(token.start);
      if (!scope.variables.has(token.text)) scope.variables.set(token.text, { name: token.text, type, at: token.start });
    };
    if (arrow !== -1) define(parts[arrow - 1], 'int|string');
    const value = parts.slice(arrow + 1);
    if (value[0]?.text === '[' || value[0]?.text.toLowerCase() === 'list') {
      for (const token of value) define(token, 'mixed');
    } else define(value.find((token) => token.kind === 'var'), elementOf(iterated));
  }

  private lookup(scope: Scope, name: string): Variable | undefined {
    for (let current: Scope | undefined = scope; current; current = current.inherits ? current.parent : undefined) {
      const variable = current.variables.get(name);
      if (variable) return variable;
    }
    return undefined;
  }

  /** The variable named name visible at offset. */
  variable(name: string, offset: number) {
    return this.lookup(this.innermost(offset), name);
  }

  /** Every variable visible at offset (the enclosing function's, plus arrow function parameters). */
  visibleVariables(offset: number) {
    const seen = new Map<string, Variable>();
    for (let scope: Scope | undefined = this.innermost(offset); scope; scope = scope.inherits ? scope.parent : undefined) {
      for (const variable of scope.variables.values()) if (!seen.has(variable.name)) seen.set(variable.name, variable);
    }
    return [...seen.values()];
  }

  /** Whether offset is inside a comment or a string (`'single'` or `"double"`). */
  inside(offset: number): 'comment' | 'single' | 'double' | undefined {
    // A line comment (or an unclosed block comment) still holds the cursor at its end.
    if (this.comments.some(([start, end, open]) => start < offset && (offset < end || (open && offset === end)))) return 'comment';
    const string = this.tokens.find((token) => token.kind === 'str' && token.start < offset && (offset < token.end || (offset === token.end && token.end === this.source.length && !closed(token))));
    if (!string) return undefined;
    return string.text[0] === '"' ? 'double' : 'single';
  }

  /** The tokens that end at or before offset. */
  tokensBefore(offset: number) {
    let count = 0;
    while (count < this.tokens.length && this.tokens[count].end <= offset) count++;
    return this.tokens.slice(0, count);
  }

  /** The signature of a user or library function. */
  functionSignature(name: string): Signature | undefined {
    const user = this.functions.get(name);
    if (user) return { name, params: user.params, returns: user.returns, label: `${name}(${user.params.join(', ')})` };
    return libraryFunctions().get(name) ?? libraryFunctions().get(name.toLowerCase());
  }

  /** The type of the expression starting at tokens[index]. */
  evaluate(index: number, offset: number): string {
    const end = this.expressionEnd(index);
    for (let i = index; i < end; i++) {
      const text = this.tokens[i].text;
      if (OPEN[text]) i = this.close(i);
      else if (text === '?') return this.operand(i + 1, offset).type;
    }
    const left = this.operand(index, offset);
    const operator = left.next < end ? this.tokens[left.next].text.toLowerCase() : undefined;
    if (!operator) return left.type;
    if (operator === '.') return 'string';
    if (operator === '<=>') return 'int';
    if (COMPARISON.has(operator) || operator === '!') return 'bool';
    if (operator === '??' || operator === '?:') return left.type;
    if (['+', '-', '*', '/', '%', '**'].includes(operator)) {
      if (operator === '/') return 'int|float';
      const right = this.operand(left.next + 1, offset).type;
      return left.type === 'float' || right === 'float' ? 'float' : left.type;
    }
    return left.type;
  }

  private expressionEnd(from: number) {
    for (let i = from; i < this.tokens.length; i++) {
      const text = this.tokens[i].text;
      if (OPEN[text]) i = this.close(i);
      else if ([';', ',', ')', ']', '}', '=>'].includes(text) || text.toLowerCase() === 'as') return i;
    }
    return this.tokens.length;
  }

  /** One operand and its postfix (`$a[0]`, `$q->top()`): its type and the token after it. */
  private operand(index: number, offset: number): { type: string; next: number } {
    const { tokens } = this;
    const token = tokens[index];
    if (!token) return { type: 'mixed', next: index };
    const text = token.text;
    const lower = text.toLowerCase();
    let type = 'mixed';
    let next = index + 1;
    if (text === '(' && CASTS[tokens[index + 1]?.text.toLowerCase()] && tokens[index + 2]?.text === ')') {
      return { type: CASTS[tokens[index + 1].text.toLowerCase()], next: this.operand(index + 3, offset).next };
    }
    if (text === '!') return { type: 'bool', next: this.operand(index + 1, offset).next };
    if (text === '-' || text === '+' || text === '@' || text === '&') return this.operand(index + 1, offset);
    if (text === '(') {
      type = this.evaluate(index + 1, offset);
      next = this.close(index) + 1;
    } else if (token.kind === 'num') type = /^0[xXbB]/.test(text) || !/[.eE]/.test(text) ? 'int' : 'float';
    else if (token.kind === 'str') type = 'string';
    else if (text === '[' || (lower === 'array' && tokens[index + 1]?.text === '(')) {
      const open = text === '[' ? index : index + 1;
      next = this.close(open) + 1;
      type = this.arrayLiteral(open, offset);
    } else if (lower === 'true' || lower === 'false') type = 'bool';
    else if (lower === 'null') type = 'null';
    else if (lower === 'new' && tokens[index + 1]?.kind === 'id') {
      type = tokens[index + 1].text.replace(/^\\/, '');
      next = tokens[index + 2]?.text === '(' ? this.close(index + 2) + 1 : index + 2;
    } else if (lower === 'fn' || lower === 'function') {
      type = 'Closure';
      next = this.expressionEnd(index);
    } else if (token.kind === 'var') type = this.variable(text, offset)?.type ?? 'mixed';
    else if (token.kind === 'id' && tokens[index + 1]?.text === '(') {
      next = this.close(index + 1) + 1;
      type = this.callType(this.functionSignature(text)?.returns, index + 1, offset);
    } else if (token.kind === 'id' && PHP_CONSTANTS[text]) type = PHP_CONSTANTS[text];

    // Postfix: indexing and method calls.
    while (next < tokens.length) {
      const postfix = tokens[next].text;
      if (postfix === '[') {
        type = elementOf(type);
        next = this.close(next) + 1;
      } else if ((postfix === '->' || postfix === '?->') && tokens[next + 1]?.kind === 'id') {
        const member = classMembers(type)?.find((candidate) => candidate.name === tokens[next + 1].text);
        if (tokens[next + 2]?.text === '(') {
          type = this.callType(member?.returns, next + 2, offset);
          next = this.close(next + 2) + 1;
        } else {
          type = 'mixed';
          next += 2;
        }
      } else break;
    }
    return { type, next };
  }

  /** `[1, 2]` → `int[]`, `["a" => 1]` → `array`. */
  private arrayLiteral(open: number, offset: number) {
    const close = this.close(open);
    if (close === open + 1) return 'array';
    const first = this.expressionEnd(open + 1);
    if (this.tokens[first]?.text === '=>') return 'array';
    const element = this.evaluate(open + 1, offset);
    return element === 'mixed' ? 'array' : `${element}[]`;
  }

  /** A return type with `$n` / `elem($n)` resolved from the call's arguments. */
  private callType(returns: string | undefined, open: number, offset: number) {
    if (!returns) return 'mixed';
    if (!returns.includes('$')) return returns;
    const argument = (n: number) => {
      let start = open + 1;
      const close = this.close(open);
      for (let k = 0; k < n; k++) {
        const end = this.expressionEnd(start);
        if (end >= close) return 'mixed';
        start = end + 1;
      }
      return start < close ? this.evaluate(start, offset) : 'mixed';
    };
    const element = /^elem\(\$(\d)\)$/.exec(returns);
    if (element) return elementOf(argument(Number(element[1])));
    const direct = /^\$(\d)$/.exec(returns);
    return direct ? argument(Number(direct[1])) : 'mixed';
  }

  /** The type of the variable right before `->` at tokens[index - 1] (`$stack->`). */
  receiverType(before: Token[], offset: number) {
    const last = before.at(-1);
    if (last?.kind === 'var') return this.variable(last.text, offset)?.type;
    return undefined;
  }
}

function closed(token: Token) {
  return token.text.length > 1 && token.text.at(-1) === token.text[0] && token.text.at(-2) !== '\\';
}
