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

const { Analysis, typeToString, packageMembers } = await import('../src/features/game/editor/go/analysis.ts');

const SOURCE = `package main

import (
  "sort"
  "strconv"
  "strings"
)

type Point struct {
  x, y int
  next *Point
}

func (p *Point) Dist() int { return p.x + p.y }

func build(n int) []int { return make([]int, n) }

func solution(nums []int, words []string, k int) int {
  counts := make(map[string]int)
  seen := map[int]bool{}
  grid := [][]int{{1, 2}, {3, 4}}
  var sb strings.Builder
  var total int64
  values := build(3)
  p := &Point{x: 1, y: 2}
  n, err := strconv.Atoi("12")
  parts := strings.Split("a b", " ")
  for i, v := range nums {
    total += int64(i + v)
  }
  for key, count := range counts {
    _ = key
    _ = count
  }
  for idx, ch := range "abc" {
    _, _ = idx, ch
  }
  if c, ok := counts["a"]; ok {
    _ = c
  }
  sorted := append([]int{}, nums...)
  sort.Ints(sorted)
  return int(total)
}
`;

const analysis = new Analysis(SOURCE);
const end = SOURCE.indexOf('return int(total)');
const typeOf = (name) => typeToString(analysis.typeOfVariable(name, end));

test('declarations', () => {
  assert.equal(typeOf('nums'), '[]int');
  assert.equal(typeOf('words'), '[]string');
  assert.equal(typeOf('k'), 'int');
  assert.equal(typeOf('counts'), 'map[string]int');
  assert.equal(typeOf('seen'), 'map[int]bool');
  assert.equal(typeOf('grid'), '[][]int');
  assert.equal(typeOf('sb'), 'strings.Builder');
  assert.equal(typeOf('total'), 'int64');
  assert.equal(typeOf('values'), '[]int');
  assert.equal(typeOf('p'), '*Point');
  assert.equal(typeOf('n'), 'int');
  assert.equal(typeOf('err'), 'error');
  assert.equal(typeOf('parts'), '[]string');
  assert.equal(typeOf('sorted'), '[]int');
});

test('range and comma-ok', () => {
  assert.equal(typeOf('i'), 'int');
  assert.equal(typeOf('v'), 'int');
  assert.equal(typeOf('key'), 'string');
  assert.equal(typeOf('count'), 'int');
  assert.equal(typeOf('idx'), 'int');
  assert.equal(typeOf('ch'), 'rune');
  assert.equal(typeOf('c'), 'int');
  assert.equal(typeOf('ok'), 'bool');
});

const at = (code) => {
  const source = SOURCE.replace('  return int(total)', `  ${code}\n  return int(total)`);
  const local = new Analysis(source);
  const cursor = source.indexOf(code) + code.length;
  const tokens = local.tokensBefore(cursor);
  tokens.pop();
  const expression = local.expressionBefore(tokens);
  if (expression.length === 1 && local.isPackage(expression[0].text, cursor)) return { type: 'package', names: packageMembers(expression[0].text).map((m) => m.name) };
  const receiver = local.evaluate(expression, cursor);
  return { type: typeToString(receiver), names: receiver ? local.members(receiver).map((member) => member.name) : [] };
};

test('member access contexts', () => {
  assert.ok(at('strings.').names.includes('Split'));
  assert.ok(at('sort.').names.includes('Slice'));
  assert.deepEqual(at('p.').names, ['x', 'y', 'next', 'Dist']);
  assert.equal(at('p.next.').type, '*Point');
  assert.ok(at('sb.').names.includes('WriteString'));
  assert.equal(at('grid[0][1].').type, 'int');
  assert.equal(at('grid[0].').type, '[]int');
  assert.equal(at('parts[0][1:].').type, 'string');
  assert.equal(at('p.Dist().').type, 'int');
});
