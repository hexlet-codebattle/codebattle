// Editor telemetry for bot detection (port of the legacy utils/editorSummary.ts): keys,
// edits and blocked pastes are aggregated in ~10 s windows and pushed as `editor:summary`
// (Codebattle.Game.EditorEventBatch, read by Game.BotDetection and the /games/:id/ml page).

export interface TelemetryEvent {
  type: 'keydown' | 'content_change' | 'paste_blocked' | 'drop_blocked';
  offset_ms: number;
  lang_slug: string;
  text_length?: number;
  key?: string;
  code?: string;
  ctrl_key?: boolean;
  meta_key?: boolean;
  alt_key?: boolean;
  change_count?: number;
  inserted_chars?: number;
  deleted_chars?: number;
  net_text_delta?: number;
  max_single_insert_len?: number;
  max_single_delete_len?: number;
  multi_char_insert_count?: number;
  multi_char_delete_count?: number;
  multi_line_insert_count?: number;
  large_insert_count?: number;
}

export const WINDOW_MS = 10_000;
export const EVENT_LIMIT = 100;

interface TelemetryWindow {
  event_count: number;
  window_start_offset_ms: number;
  window_end_offset_ms: number;
  lang_slug: string;
  key_event_count: number;
  printable_key_count: number;
  modifier_shortcut_count: number;
  copy_shortcut_count: number;
  cut_shortcut_count: number;
  paste_shortcut_attempt_count: number;
  undo_shortcut_count: number;
  redo_shortcut_count: number;
  backspace_count: number;
  delete_count: number;
  enter_count: number;
  tab_count: number;
  arrow_key_count: number;
  paste_blocked_count: number;
  drop_blocked_count: number;
  content_change_count: number;
  chars_inserted: number;
  chars_deleted: number;
  net_text_delta: number;
  max_single_insert_len: number;
  max_single_delete_len: number;
  multi_char_insert_count: number;
  multi_char_delete_count: number;
  multi_line_insert_count: number;
  large_insert_count: number;
  final_text_length: number;
  key_delta_sample_count: number;
  key_delta_total_ms: number;
  min_key_delta_ms: number;
  max_key_delta_ms: number;
  idle_pause_over_2s_count: number;
  last_key_offset_ms: number | null;
}

const newWindow = (event: TelemetryEvent): TelemetryWindow => ({
  event_count: 0,
  window_start_offset_ms: event.offset_ms,
  window_end_offset_ms: event.offset_ms,
  lang_slug: event.lang_slug,
  key_event_count: 0,
  printable_key_count: 0,
  modifier_shortcut_count: 0,
  copy_shortcut_count: 0,
  cut_shortcut_count: 0,
  paste_shortcut_attempt_count: 0,
  undo_shortcut_count: 0,
  redo_shortcut_count: 0,
  backspace_count: 0,
  delete_count: 0,
  enter_count: 0,
  tab_count: 0,
  arrow_key_count: 0,
  paste_blocked_count: 0,
  drop_blocked_count: 0,
  content_change_count: 0,
  chars_inserted: 0,
  chars_deleted: 0,
  net_text_delta: 0,
  max_single_insert_len: 0,
  max_single_delete_len: 0,
  multi_char_insert_count: 0,
  multi_char_delete_count: 0,
  multi_line_insert_count: 0,
  large_insert_count: 0,
  final_text_length: event.text_length ?? 0,
  key_delta_sample_count: 0,
  key_delta_total_ms: 0,
  min_key_delta_ms: 0,
  max_key_delta_ms: 0,
  idle_pause_over_2s_count: 0,
  last_key_offset_ms: null,
});

const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Adds one event to the window (creating it when needed); mutates and returns it. */
export function addEvent(current: TelemetryWindow | null, event: TelemetryEvent): TelemetryWindow {
  const w = current ?? newWindow(event);
  w.event_count += 1;
  w.window_end_offset_ms = event.offset_ms;
  w.lang_slug = event.lang_slug || w.lang_slug;
  if (typeof event.text_length === 'number') w.final_text_length = event.text_length;

  switch (event.type) {
    case 'keydown': {
      w.key_event_count += 1;
      const modifier = event.ctrl_key || event.meta_key;
      if (typeof event.key === 'string' && event.key.length === 1 && !modifier && !event.alt_key) w.printable_key_count += 1;
      if (modifier) {
        w.modifier_shortcut_count += 1;
        if (event.code === 'KeyC') w.copy_shortcut_count += 1;
        if (event.code === 'KeyX') w.cut_shortcut_count += 1;
        if (event.code === 'KeyV') w.paste_shortcut_attempt_count += 1;
        if (event.code === 'KeyZ') w.undo_shortcut_count += 1;
        if (event.code === 'KeyY') w.redo_shortcut_count += 1;
      }
      if (event.key === 'Backspace') w.backspace_count += 1;
      if (event.key === 'Delete') w.delete_count += 1;
      if (event.key === 'Enter') w.enter_count += 1;
      if (event.key === 'Tab') w.tab_count += 1;
      if (event.key && ARROWS.has(event.key)) w.arrow_key_count += 1;

      if (w.last_key_offset_ms != null) {
        const delta = Math.max(0, event.offset_ms - w.last_key_offset_ms);
        w.key_delta_sample_count += 1;
        w.key_delta_total_ms += delta;
        w.min_key_delta_ms = w.key_delta_sample_count === 1 ? delta : Math.min(w.min_key_delta_ms, delta);
        w.max_key_delta_ms = Math.max(w.max_key_delta_ms, delta);
        if (delta >= 2_000) w.idle_pause_over_2s_count += 1;
      }
      w.last_key_offset_ms = event.offset_ms;
      break;
    }
    case 'paste_blocked':
      w.paste_blocked_count += 1;
      break;
    case 'drop_blocked':
      w.drop_blocked_count += 1;
      break;
    case 'content_change':
      w.content_change_count += event.change_count ?? 0;
      w.chars_inserted += event.inserted_chars ?? 0;
      w.chars_deleted += event.deleted_chars ?? 0;
      w.net_text_delta += event.net_text_delta ?? 0;
      w.max_single_insert_len = Math.max(w.max_single_insert_len, event.max_single_insert_len ?? 0);
      w.max_single_delete_len = Math.max(w.max_single_delete_len, event.max_single_delete_len ?? 0);
      w.multi_char_insert_count += event.multi_char_insert_count ?? 0;
      w.multi_char_delete_count += event.multi_char_delete_count ?? 0;
      w.multi_line_insert_count += event.multi_line_insert_count ?? 0;
      w.large_insert_count += event.large_insert_count ?? 0;
      break;
    default:
      break;
  }

  return w;
}

/** The summary pushed to the server; null for an empty window. */
export function finalize(w: TelemetryWindow | null) {
  if (!w || w.event_count <= 0) return null;
  const { last_key_offset_ms: _last, key_delta_total_ms: total, ...rest } = w;
  return { ...rest, avg_key_delta_ms: w.key_delta_sample_count > 0 ? Math.round(total / w.key_delta_sample_count) : 0 };
}

/** content_change metrics from Monaco's model change event. */
export function contentMetrics(changes: { text: string; rangeLength: number }[]) {
  return changes.reduce(
    (acc, change) => {
      const inserted = change.text.length;
      const deleted = change.rangeLength;
      return {
        inserted_chars: acc.inserted_chars + inserted,
        deleted_chars: acc.deleted_chars + deleted,
        max_single_insert_len: Math.max(acc.max_single_insert_len, inserted),
        max_single_delete_len: Math.max(acc.max_single_delete_len, deleted),
        multi_char_insert_count: acc.multi_char_insert_count + (inserted > 1 ? 1 : 0),
        multi_char_delete_count: acc.multi_char_delete_count + (deleted > 1 ? 1 : 0),
        multi_line_insert_count: acc.multi_line_insert_count + (change.text.includes('\n') ? 1 : 0),
        large_insert_count: acc.large_insert_count + (inserted >= 50 ? 1 : 0),
      };
    },
    {
      inserted_chars: 0,
      deleted_chars: 0,
      max_single_insert_len: 0,
      max_single_delete_len: 0,
      multi_char_insert_count: 0,
      multi_char_delete_count: 0,
      multi_line_insert_count: 0,
      large_insert_count: 0,
    },
  );
}
