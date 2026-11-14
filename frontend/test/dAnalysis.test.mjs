import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

// The editor sources import siblings without extensions (Vite style).
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.')) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const { Analysis, typeToString } = await import('../src/features/game/editor/clike/analysis.ts');
const { DLANG } = await import('../src/features/game/editor/d/library.ts');

const SOURCE = `import std;

struct Edge { int to; long weight; }

long solution(long[] nums, string text, long[string] scores) {
    long[string] counts;
    int[26] letters;
    auto words = text.split;
    auto sorted = nums.dup.sort.array;
    immutable n = nums.length;
    auto total = nums.sum;
    auto parsed = "12".to!long;
    auto squares = [1, 2, 3];
    auto lookup = ["a": 1];
    Edge[] edges;
    foreach (x; nums) { total += x; }
    foreach (i, w; words) {}
    foreach (key, value; scores) {}
    foreach (k; 0 .. n) {}
    return total;
}
`;

const analysis = new Analysis(SOURCE, DLANG);
const end = SOURCE.indexOf('return total');
const typeOf = (name) => typeToString(analysis.typeOfVariable(name, end));

test('declarations', () => {
  assert.equal(typeOf('nums'), 'long[]');
  assert.equal(typeOf('text'), 'string');
  assert.equal(typeOf('scores'), 'long[string]');
  assert.equal(typeOf('counts'), 'long[string]');
  assert.equal(typeOf('letters'), 'int[]');
  assert.equal(typeOf('words'), 'string[]');
  assert.equal(typeOf('sorted'), 'long[]');
  assert.equal(typeOf('n'), 'size_t');
  assert.equal(typeOf('total'), 'long');
  assert.equal(typeOf('parsed'), 'long');
  assert.equal(typeOf('squares'), 'int[]');
  assert.equal(typeOf('lookup'), 'int[string]');
  assert.equal(typeOf('edges'), 'Edge[]');
});

test('foreach', () => {
  assert.equal(typeOf('x'), 'long');
  assert.equal(typeOf('i'), 'size_t');
  assert.equal(typeOf('w'), 'string');
  assert.equal(typeOf('key'), 'string');
  assert.equal(typeOf('value'), 'long');
  assert.equal(typeOf('k'), 'int');
});

const at = (code) => {
  const source = SOURCE.replace('return total;', `${code}\n    return total;`);
  const local = new Analysis(source, DLANG);
  const cursor = source.indexOf(code) + code.length;
  const tokens = local.tokensBefore(cursor);
  tokens.pop();
  const receiver = local.evaluate(local.expressionBefore(tokens), cursor);
  return { type: typeToString(receiver), names: receiver ? local.members(receiver).map((member) => member.name) : [] };
};

test('UFCS member contexts', () => {
  assert.ok(at('nums.').names.includes('sort'));
  assert.ok(at('nums.').names.includes('canFind'));
  assert.equal(at('nums.sort.uniq.').type, 'long[]');
  assert.equal(at('nums.filter!(x => x > 0).').type, 'long[]');
  assert.equal(at('text.').type, 'string');
  assert.ok(at('text.').names.includes('strip'));
  assert.equal(at('text.split(",").').type, 'string[]');
  assert.ok(at('scores.').names.includes('keys'));
  assert.equal(at('scores.keys.').type, 'string[]');
  assert.equal(at('scores["a"].').type, 'long');
  assert.equal(at('edges[0].').type, 'Edge');
  assert.deepEqual(at('edges[0].').names, ['to', 'weight']);
  assert.equal(at('nums[0].to!string.').type, 'string');
  assert.equal(at('iota(5).').type, 'int[]');
});
