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

const { Analysis, classMembers, libraryFunctions, parseEntry } = await import('../src/features/game/editor/php/analysis.ts');

const SOURCE = `<?php

function helper(array $xs, int ...$rest): string {
  return implode(",", $xs);
}

function solution(int $n, array $nums, string $s) {
  $ans = 0;
  $words = explode(" ", $s);
  $chars = str_split($s);
  $counts = array_count_values($chars);
  $total = array_sum($nums) + 1.5;
  $label = "n=" . $n;
  $ok = $n > 2;
  $grid = [[1, 2], [3, 4]];
  $list = [1, 2, 3];
  $map = ["a" => 1];
  $stack = new SplStack();
  $heap = new \\SplMinHeap();
  $top = $stack->top();
  $first = $words[0];
  $last = array_pop($words);
  $sorted = array_reverse($list);
  $size = (int) "12";
  $pick = $ok ? "yes" : "no";
  $seen[] = 1;
  $text = helper($words);
  foreach ($words as $i => $w) {
    $len = strlen($w);
  }
  $double = array_map(fn($x) => $x * 2, $nums);
  $add = function ($v) use ($n, $label) {
    $inner = $v;
    return $v + $n;
  };
  // $commented = 1;
  $str = "$ans and $n";
  return $ans;
}
`;

const at = (marker, after = 0) => SOURCE.indexOf(marker) + after;
const analysis = new Analysis(SOURCE);
const type = (name, marker = 'return $ans;') => analysis.variable(name, at(marker))?.type;

test('parameter hints and literals type the variables', () => {
  assert.equal(type('$n'), 'int');
  assert.equal(type('$nums'), 'array');
  assert.equal(type('$s'), 'string');
  assert.equal(type('$ans'), 'int');
  assert.equal(type('$total'), 'float');
  assert.equal(type('$label'), 'string');
  assert.equal(type('$ok'), 'bool');
  assert.equal(type('$grid'), 'int[][]');
  assert.equal(type('$list'), 'int[]');
  assert.equal(type('$map'), 'array');
  assert.equal(type('$size'), 'int');
  assert.equal(type('$pick'), 'string');
  assert.equal(type('$seen'), 'array');
});

test('library return types, $0 and element types', () => {
  assert.equal(type('$words'), 'string[]');
  assert.equal(type('$chars'), 'string[]');
  assert.equal(type('$counts'), 'int[]');
  assert.equal(type('$first'), 'string');
  assert.equal(type('$last'), 'string');
  assert.equal(type('$sorted'), 'int[]');
  assert.equal(type('$double'), 'array');
  assert.equal(type('$text'), 'string');
});

test('classes and methods', () => {
  assert.equal(type('$stack'), 'SplStack');
  assert.equal(type('$heap'), 'SplMinHeap');
  assert.equal(type('$top'), 'mixed');
  assert.ok(classMembers('SplStack').some((member) => member.name === 'push'));
  assert.ok(classMembers('SplPriorityQueue').some((member) => member.name === 'insert' && member.params.length === 2));
});

test('scopes: functions, foreach, arrow functions and closures', () => {
  const insideLoop = at('$len = strlen');
  assert.equal(analysis.variable('$w', insideLoop)?.type, 'string');
  assert.equal(analysis.variable('$i', insideLoop)?.type, 'int|string');
  assert.equal(analysis.variable('$len', insideLoop)?.type, 'int');
  // helper's variables aren't solution's.
  assert.equal(analysis.variable('$xs', at('return $ans;')), undefined);
  assert.equal(analysis.variable('$rest', at('return implode'))?.type, 'int[]');
  // The arrow function sees its parameter and the outer variables.
  const arrow = at('$x * 2');
  assert.equal(analysis.variable('$x', arrow)?.type, 'mixed');
  assert.equal(analysis.variable('$n', arrow)?.type, 'int');
  assert.equal(analysis.variable('$x', at('return $ans;')), undefined);
  // The closure sees only its parameters and `use` variables, typed from outside.
  const closure = at('return $v + $n');
  const names = analysis.visibleVariables(closure).map((variable) => variable.name).sort();
  assert.deepEqual(names, ['$inner', '$label', '$n', '$v']);
  assert.equal(analysis.variable('$label', closure)?.type, 'string');
  assert.equal(analysis.variable('$inner', at('return $ans;')), undefined);
});

test('comments and strings', () => {
  assert.equal(analysis.inside(at('$commented', 1)), 'comment');
  assert.equal(analysis.inside(at('$ans and', 2)), 'double');
  assert.equal(analysis.inside(at('$ans = 0')), undefined);
  assert.equal(type('$commented'), undefined);
  const open = new Analysis('<?php\n$a = "unclosed');
  assert.equal(open.inside(open.tokens.at(-1).end), 'double');
  const line = new Analysis('<?php\n// note\n$a = 1;');
  assert.equal(line.inside(line.tokens[0].start), undefined);
});

test('signatures', () => {
  assert.equal(analysis.functionSignature('helper').returns, 'string');
  assert.deepEqual(analysis.functionSignature('helper').params, ['array $xs', 'int ...$rest']);
  const usort = libraryFunctions().get('usort');
  assert.deepEqual(usort.params, ['array &$array', 'callable $callback']);
  assert.equal(parseEntry('__construct(int $size = 0) — x').returns, '');
  for (const signature of libraryFunctions().values()) assert.ok(signature.name && !signature.name.includes(' '), signature.label);
});
