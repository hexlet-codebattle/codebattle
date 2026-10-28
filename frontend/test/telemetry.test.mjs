import assert from 'node:assert/strict';
import test from 'node:test';

import { addEvent, contentMetrics, finalize, SYNC_EDIT_SOURCE } from '../src/features/game/editor/telemetry.ts';

const edit = (metadata) => ({
  changes: [{ text: 'const answer = 42;\n'.repeat(10), rangeLength: 0 }],
  detailedReasons: [{ metadata }],
  detailedReasonsChangeLengths: [1],
});

test('Vim commands remain visible as assistance rather than unexplained injection', () => {
  const metrics = contentMetrics(edit({ source: 'unknown', name: 'vim' }));
  assert.equal(metrics.command_insert_count, 1);
  assert.equal(metrics.assisted_chars, metrics.inserted_chars);
  assert.equal(metrics.large_insert_count, 0);
  assert.equal(metrics.multi_line_insert_count, 0);
});

test('unrecognized external edits still produce bulk-insert evidence', () => {
  const metrics = contentMetrics(edit({ source: 'unknown', name: 'extension' }));
  assert.equal(metrics.assisted_chars, 0);
  assert.equal(metrics.large_insert_count, 1);
  assert.equal(metrics.multi_line_insert_count, 1);
});

test('our own text syncs are excluded, while ordinary completions remain accounted for', () => {
  assert.equal(contentMetrics(edit({ source: 'unknown', name: SYNC_EDIT_SOURCE })), null);
  const metrics = contentMetrics(edit({ source: 'suggest' }));
  assert.equal(metrics.assisted_chars, metrics.inserted_chars);
  assert.equal(metrics.completion_insert_count, 1);
});

test('flushed windows retain the key boundaries needed to count pauses between windows', () => {
  const key = (offset_ms) => ({ type: 'keydown', key: 'a', lang_slug: 'js', offset_ms });
  let first = addEvent(null, key(100));
  first = addEvent(first, key(200));
  const before = finalize(first);
  const after = finalize(addEvent(null, key(5200)));
  assert.equal(before.collector_version, 3);
  assert.equal(before.first_key_offset_ms, 100);
  assert.equal(before.last_key_offset_ms, 200);
  assert.equal(after.first_key_offset_ms - before.last_key_offset_ms, 5000);
  assert.equal(after.last_key_offset_ms, 5200);
});

test('a pause within a window agrees with its maximum key interval', () => {
  let window = addEvent(null, { type: 'keydown', key: 'a', lang_slug: 'js', offset_ms: 0 });
  window = addEvent(window, { type: 'keydown', key: 'b', lang_slug: 'js', offset_ms: 2500 });
  const summary = finalize(window);
  assert.equal(summary.idle_pause_over_2s_count, 1);
  assert.equal(summary.max_key_delta_ms, 2500);
});


test('bulk edit evidence retains local explanations and timestamps separately', () => {
  const base = { type: 'content_change', lang_slug: 'js', change_count: 1, inserted_chars: 100 };
  let window = addEvent(null, { ...base, offset_ms: 1000, assisted_chars: 100 });
  window = addEvent(window, { ...base, offset_ms: 5000 });
  assert.deepEqual(finalize(window).edit_evidence, [
    { offset_ms: 1000, inserted_chars: 100, assisted_chars: 100, paste_chars: 0, printable_keys: 0 },
    { offset_ms: 5000, inserted_chars: 100, assisted_chars: 0, paste_chars: 0, printable_keys: 0 },
  ]);
});


test('IME composition does not become an unexplained bulk edit', () => {
  const metrics = contentMetrics(edit({ source: 'cursor', kind: 'compositionEnd' }));
  assert.equal(metrics.assisted_chars, metrics.inserted_chars);
  assert.equal(metrics.large_insert_count, 0);
});
