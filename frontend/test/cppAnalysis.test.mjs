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

const { Analysis: ClikeAnalysis, typeToString } = await import('../src/features/game/editor/clike/analysis.ts');
const { CPP } = await import('../src/features/game/editor/cpp/stdlib.ts');

class Analysis extends ClikeAnalysis {
  constructor(source) {
    super(source, CPP);
  }
}

const SOURCE = `#include <bits/stdc++.h>
using namespace std;
#define ll long long
using pii = pair<int, int>;
typedef vector<int> vi;

struct Edge {
  int to;
  long long weight;
  bool operator<(const Edge& other) const { return weight < other.weight; }
};

vector<int> build(int n) { return vector<int>(n); }

int solution(const vector<int>& nums, int k) {
  map<string, int> cnt;
  vector<vector<int>> g(5);
  vi values = build(3);
  set<pii> seen;
  priority_queue<Edge> pq;
  ll total = 0, best = 1;
  int a[100];
  for (auto& [word, times] : cnt) { total += times; }
  for (int x : nums) { total += x; }
  for (const auto& row : g) {}
  auto it = cnt.find("a");
  auto mx = max_element(nums.begin(), nums.end());
  auto p = make_pair(1, string("x"));
  auto [first, second] = p;
  auto top = pq.top();
  string s = to_string(k);
  auto sub = s.substr(1);
  function<void(int)> dfs = [&](int u) {
    for (int v : g[u]) { int depth = v; }
  };
  return 0;
}
`;

const analysis = new Analysis(SOURCE);
const end = SOURCE.indexOf('return 0');
const typeOf = (name) => typeToString(analysis.typeOfVariable(name, end));

test('declared types, aliases and parameters', () => {
  assert.equal(typeOf('nums'), 'vector<int>');
  assert.equal(typeOf('k'), 'int');
  assert.equal(typeOf('cnt'), 'map<string, int>');
  assert.equal(typeOf('g'), 'vector<vector<int>>');
  assert.equal(typeOf('values'), 'vector<int>');
  assert.equal(typeOf('seen'), 'set<pair<int, int>>');
  assert.equal(typeOf('total'), 'long long');
  assert.equal(typeOf('best'), 'long long');
  assert.equal(typeOf('a'), 'int[]');
  assert.equal(typeOf('dfs'), 'function<void, (int)>');
});

test('range-for, structured bindings and lambdas', () => {
  assert.equal(typeOf('word'), 'string');
  assert.equal(typeOf('times'), 'int');
  assert.equal(typeOf('x'), 'int');
  assert.equal(typeOf('row'), 'vector<int>');
  assert.equal(typeOf('first'), 'int');
  assert.equal(typeOf('second'), 'string');
  assert.equal(typeOf('u'), 'int');
  assert.equal(typeOf('v'), 'int');
  assert.equal(typeOf('depth'), 'int');
});

test('auto from expressions', () => {
  assert.equal(typeOf('it'), 'iterator<pair<string, int>>');
  assert.equal(typeOf('mx'), 'iterator<int>');
  assert.equal(typeOf('p'), 'pair<int, string>');
  assert.equal(typeOf('top'), 'Edge');
  assert.equal(typeOf('s'), 'string');
  assert.equal(typeOf('sub'), 'string');
});

const at = (code) => {
  const source = SOURCE.replace('return 0;', `${code}\n  return 0;`);
  const local = new Analysis(source);
  const cursor = source.indexOf(code) + code.length;
  const tokens = local.tokensBefore(cursor);
  const connector = tokens.pop();
  const expression = local.expressionBefore(tokens);
  let receiver = local.evaluate(expression, cursor);
  if (connector.text === '->') receiver = receiver && local.derefOf(receiver);
  return { names: receiver ? local.members(receiver).map((member) => member.name) : [], type: typeToString(receiver) };
};

test('member access contexts', () => {
  assert.ok(at('nums.').names.includes('push_back'));
  assert.equal(at('g[0].').type, 'vector<int>');
  assert.equal(at('it->').type, 'pair<string, int>');
  assert.deepEqual(at('it->').names.slice(0, 2), ['first', 'second']);
  assert.equal(at('pq.top().').type, 'Edge');
  assert.deepEqual(at('pq.top().').names.slice(0, 2), ['to', 'weight']);
  assert.equal(at('cnt.begin()->first.').type, 'string');
  assert.ok(at('cnt.begin()->first.').names.includes('substr'));
  assert.equal(at('(*mx).').type, 'int');
  assert.equal(at('seen.lower_bound({1, 2})->').type, 'pair<int, int>');
  assert.equal(at('s.su').type, 'string');
});
