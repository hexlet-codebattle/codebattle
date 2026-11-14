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

const { Analysis, typeToString } = await import('../src/features/game/editor/ruby/analysis.ts');

const SOURCE = `require "set"

def solution(nums, words, k)
  counts = Hash.new(0)
  seen = Set.new
  total = 0
  best = nums.max
  sorted = nums.sort.reverse
  doubled = nums.map { |x| x * 2 }
  ints = gets.split.map(&:to_i)
  first, second = ints
  grid = Array.new(3) { Array.new(3, 0) }
  pairs = { "a" => 1 }
  letters = %w[a b c]
  nums.each_with_index do |value, index|
    total += value
  end
  pairs.each { |key, count| counts[key] += count }
  words.each_with_object({}) { |word, memo| memo[word] = word.size }
  (1..k).each { |i| total += i }
  k.times { |step| total += step }
  for item in letters
    total += item.size
  end
  name = words.first.upcase
  total
end
`;

const HINTS = new Map([
  ['nums', 'Array[Integer]'],
  ['words', 'Array[String]'],
  ['k', 'Integer'],
]);
const analysis = new Analysis(SOURCE, HINTS);
const end = SOURCE.lastIndexOf('total');
const typeOf = (name) => typeToString(analysis.typeOfVariable(name, end));

test('the task signature types the solution parameters', () => {
  assert.equal(typeOf('nums'), 'Array[Integer]');
  assert.equal(typeOf('words'), 'Array[String]');
  assert.equal(typeOf('k'), 'Integer');
});

test('assignments', () => {
  assert.equal(typeOf('counts'), 'Hash[?, Integer]');
  assert.equal(typeOf('seen'), 'Set[?]');
  assert.equal(typeOf('total'), 'Integer');
  assert.equal(typeOf('best'), 'Integer');
  assert.equal(typeOf('sorted'), 'Array[Integer]');
  assert.equal(typeOf('doubled'), 'Array[Integer]');
  assert.equal(typeOf('ints'), 'Array[Integer]');
  assert.equal(typeOf('first'), 'Integer');
  assert.equal(typeOf('second'), 'Integer');
  assert.equal(typeOf('pairs'), 'Hash[String, Integer]');
  assert.equal(typeOf('letters'), 'Array[String]');
  assert.equal(typeOf('grid'), 'Array[Array[Integer]]');
  assert.equal(typeOf('name'), 'String');
});

test('block parameters', () => {
  assert.equal(typeOf('x'), 'Integer');
  assert.equal(typeOf('value'), 'Integer');
  assert.equal(typeOf('index'), 'Integer');
  assert.equal(typeOf('key'), 'String');
  assert.equal(typeOf('count'), 'Integer');
  assert.equal(typeOf('word'), 'String');
  assert.equal(typeOf('memo'), 'Hash[?, ?]');
  assert.equal(typeOf('i'), 'Integer');
  assert.equal(typeOf('step'), 'Integer');
  assert.equal(typeOf('item'), 'String');
});

const at = (code) => {
  const source = SOURCE.replace('  total\nend', `  ${code}\n  total\nend`);
  const local = new Analysis(source, HINTS);
  const cursor = source.indexOf(code) + code.length;
  const tokens = local.tokensBefore(cursor);
  tokens.pop();
  const receiver = local.evaluate(local.expressionBefore(tokens), cursor);
  return { type: typeToString(receiver), names: receiver ? local.members(receiver).map((member) => member.name) : [] };
};

test('member access contexts', () => {
  assert.equal(at('nums.').type, 'Array[Integer]');
  assert.ok(at('nums.').names.includes('each_with_index'));
  assert.equal(at('nums.first.').type, 'Integer');
  assert.ok(at('nums.first.').names.includes('times'));
  assert.equal(at('words.map(&:size).').type, 'Array[Integer]');
  assert.equal(at('nums.map { |x| x.to_s }.').type, 'Array[String]');
  assert.equal(at('counts.keys.').type, 'Array[?]');
  assert.equal(at('pairs.values.').type, 'Array[Integer]');
  assert.equal(at('grid[0].').type, 'Array[Integer]');
  assert.equal(at('grid[0][1].').type, 'Integer');
  assert.equal(at('(1..k).').type, 'Range[Integer]');
  assert.equal(at('"abc".').type, 'String');
  assert.equal(at('words[0].chars.').type, 'Array[String]');
});
