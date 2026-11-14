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
const { JAVA } = await import('../src/features/game/editor/java/library.ts');

const SOURCE = `import java.util.*;
import java.util.stream.*;

public class Solution {
  public int solution(List<Integer> nums, String text, int[] values) {
    Map<String, Integer> counts = new HashMap<>();
    var seen = new HashSet<Integer>();
    int[][] grid = new int[3][3];
    StringBuilder sb = new StringBuilder();
    Deque<int[]> stack = new ArrayDeque<>();
    final long total = 0L;
    for (int x : nums) { seen.add(x); }
    for (Map.Entry<String, Integer> entry : counts.entrySet()) {}
    for (char c : text.toCharArray()) {}
    var words = text.split(" ");
    var best = Collections.max(nums);
    int top = Math.max(1, 2);
    var sum = Arrays.stream(values).sum();
    return helper(nums);
  }

  private int helper(List<Integer> xs) { return xs.size(); }
}
`;

const analysis = new Analysis(SOURCE, JAVA);
const end = SOURCE.indexOf('return helper');
const typeOf = (name) => typeToString(analysis.typeOfVariable(name, end));

test('declarations', () => {
  assert.equal(typeOf('nums'), 'List<Integer>');
  assert.equal(typeOf('text'), 'String');
  assert.equal(typeOf('values'), 'int[]');
  assert.equal(typeOf('counts'), 'Map<String, Integer>');
  assert.equal(typeOf('seen'), 'HashSet<Integer>');
  assert.equal(typeOf('grid'), 'int[][]');
  assert.equal(typeOf('sb'), 'StringBuilder');
  assert.equal(typeOf('stack'), 'Deque<int[]>');
  assert.equal(typeOf('total'), 'long');
});

test('for-each and var', () => {
  assert.equal(typeOf('x'), 'int');
  assert.equal(typeOf('entry'), 'Entry<String, Integer>');
  assert.equal(typeOf('c'), 'char');
  assert.equal(typeOf('words'), 'String[]');
  assert.equal(typeOf('top'), 'int');
  assert.equal(typeOf('sum'), 'int');
});

const at = (code) => {
  const source = SOURCE.replace('return helper(nums);', `${code}\n    return helper(nums);`);
  const local = new Analysis(source, JAVA);
  const cursor = source.indexOf(code) + code.length;
  const tokens = local.tokensBefore(cursor);
  tokens.pop();
  const expression = local.expressionBefore(tokens);
  if (expression.length === 1 && JAVA.statics[expression[0].text] && !local.variable(expression[0].text, cursor)) {
    return { type: `static ${expression[0].text}`, names: local.staticMembers(expression[0].text).map((member) => member.name) };
  }
  const receiver = local.evaluate(expression, cursor);
  return { type: typeToString(receiver), names: receiver ? local.members(receiver).map((member) => member.name) : [] };
};

test('member access contexts', () => {
  assert.ok(at('nums.').names.includes('get'));
  assert.equal(at('nums.get(0).').type, 'Integer');
  assert.equal(at('counts.entrySet().').type, 'Set<Entry<String, Integer>>');
  assert.deepEqual(at('entry.').names, ['getKey', 'getValue', 'setValue']);
  assert.equal(at('entry.getKey().').type, 'String');
  assert.ok(at('text.').names.includes('charAt'));
  assert.equal(at('values.').names[0], 'length');
  assert.equal(at('grid[0].').type, 'int[]');
  assert.equal(at('sb.append("x").').type, 'StringBuilder');
  assert.equal(at('stack.peek().').type, 'int[]');
  assert.ok(at('Math.').names.includes('max'));
  assert.ok(at('Integer.').names.includes('parseInt'));
  assert.equal(at('nums.stream().filter(x -> x > 0).').type, 'Stream<Integer>');
  assert.equal(at('List.of(1, 2).').type, 'List<int>');
});
