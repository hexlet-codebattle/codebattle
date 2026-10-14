// Shapes of GameController.ml props (serialize_ml_player / serialize_batch). Reports come from
// Game.BotDetection; their maps are snake_case JSON (BatchAggregator / CodeAnalyzer).

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

/** BotDetection.BatchAggregator.aggregate/1; absent when the player sent no telemetry. */
export interface MlStats {
  batch_count: number;
  total_events: number;
  total_key_events: number;
  total_printable_keys: number;
  total_chars_inserted: number;
  total_chars_deleted: number;
  total_net_text_delta: number;
  total_content_changes: number;
  total_large_inserts: number;
  total_multi_char_inserts: number;
  total_multi_char_deletes: number;
  total_multi_line_inserts: number;
  total_paste_blocked: number;
  total_paste_attempts: number;
  total_copy_shortcuts?: number;
  total_cut_shortcuts?: number;
  total_idle_pauses: number;
  total_backspace: number;
  total_delete: number;
  total_arrows: number;
  total_undo: number;
  total_redo: number;
  avg_key_delta_ms: number;
  min_key_delta_ms: number;
  max_key_delta_ms: number;
  max_single_insert_len: number;
  max_single_delete_len: number;
  elapsed_ms: number;
  events_per_sec: number;
  chars_per_sec: number;
}

/** BotDetection.CodeAnalyzer.analyze/1 over the final solution. */
export interface MlCodeAnalysis {
  total_chars: number;
  total_lines: number;
  code_lines: number;
  comment_lines: number;
  comment_to_code_ratio: number;
  long_comment_lines: number;
  gpt_phrase_hits: number;
  gpt_phrase_matches?: string[];
}

export interface MlReport {
  score: number;
  level: RiskLevel;
  /** Human-readable reasons from the risk scorer (server English). */
  signals: string[];
  stats: MlStats | null;
  code_analysis: MlCodeAnalysis | null;
  final_length: number | null;
  template_length: number | null;
  effective_added_length: number | null;
}

export interface MlPlayer {
  id: number;
  name: string;
  avatar_url: string | null;
  rating: number | null;
  rank: number | null;
  lang: string | null;
  is_bot: boolean;
  editor_text: string | null;
  editor_lang: string | null;
  report: MlReport | null;
}

/** The editor telemetry summary of one batch window (features/game/editor/telemetry.ts). */
export interface MlBatchSummary {
  chars_inserted?: number;
  chars_deleted?: number;
  avg_key_delta_ms?: number;
  printable_key_count?: number;
  paste_blocked_count?: number;
  [key: string]: unknown;
}

export interface MlBatch {
  id: number;
  user_id: number;
  lang: string | null;
  event_count: number;
  window_start_offset_ms: number | null;
  window_end_offset_ms: number | null;
  batch_started_at: string | null;
  batch_ended_at: string | null;
  summary: MlBatchSummary | null;
  inserted_at: string;
}
