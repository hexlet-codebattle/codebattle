defmodule Codebattle.BotDetectionFixtures do
  @moduledoc """
  Test fixtures for `Codebattle.Game.BotDetection` modules.

  All helpers return plain maps shaped like the persisted
  `EditorEventBatch` records (atom-keyed top level, string-keyed
  `:summary` map) so the aggregator and the rest of the pipeline can
  consume them without touching the database.
  """

  @doc """
  Returns a batch map with a default human-typing summary, overridden by
  any fields passed in `summary_overrides` (string keys) or batch-level
  overrides via `batch_overrides` (atom keys).
  """
  def batch(summary_overrides \\ %{}, batch_overrides \\ %{}) do
    Map.merge(
      %{
        id: 1,
        user_id: 1,
        lang: "js",
        event_count: Map.get(summary_overrides, "event_count", 10),
        window_start_offset_ms: Map.get(summary_overrides, "window_start_offset_ms", 0),
        window_end_offset_ms: Map.get(summary_overrides, "window_end_offset_ms", 10_000),
        batch_started_at: ~U[2026-01-01 00:00:00.000000Z],
        batch_ended_at: ~U[2026-01-01 00:00:10.000000Z],
        summary: Map.merge(human_summary(), summary_overrides),
        inserted_at: ~U[2026-01-01 00:00:10.000000Z]
      },
      batch_overrides
    )
  end

  @doc "Default summary that looks like a normal human typing window."
  def human_summary do
    %{
      "event_count" => 10,
      "key_event_count" => 8,
      "printable_key_count" => 7,
      "chars_inserted" => 7,
      "chars_deleted" => 1,
      "net_text_delta" => 6,
      "content_change_count" => 8,
      "large_insert_count" => 0,
      "multi_char_insert_count" => 0,
      "multi_char_delete_count" => 0,
      "multi_line_insert_count" => 0,
      "paste_blocked_count" => 0,
      "paste_shortcut_attempt_count" => 0,
      "copy_shortcut_count" => 0,
      "cut_shortcut_count" => 0,
      "idle_pause_over_2s_count" => 1,
      "backspace_count" => 1,
      "delete_count" => 0,
      "arrow_key_count" => 0,
      "undo_shortcut_count" => 0,
      "redo_shortcut_count" => 0,
      "avg_key_delta_ms" => 200,
      "min_key_delta_ms" => 100,
      "max_key_delta_ms" => 300,
      "key_delta_sample_count" => 7,
      "max_single_insert_len" => 1,
      "max_single_delete_len" => 1,
      "window_start_offset_ms" => 0,
      "window_end_offset_ms" => 10_000,
      "final_text_length" => 100
    }
  end

  @doc "Build a list of N batches that together look like a substantial human edit."
  def human_batches(opts \\ []) do
    count = Keyword.get(opts, :count, 6)
    chars_per = Keyword.get(opts, :chars_per_batch, 50)
    keys_per = Keyword.get(opts, :keys_per_batch, 50)

    Enum.map(0..(count - 1), fn i ->
      batch(
        %{
          "event_count" => keys_per * 2,
          "key_event_count" => keys_per,
          "printable_key_count" => keys_per,
          "chars_inserted" => chars_per,
          "chars_deleted" => 5,
          "net_text_delta" => chars_per - 5,
          "content_change_count" => keys_per,
          "backspace_count" => 5,
          "idle_pause_over_2s_count" => 2,
          "avg_key_delta_ms" => 250,
          "min_key_delta_ms" => 80,
          "max_key_delta_ms" => 1500,
          "key_delta_sample_count" => keys_per - 1,
          "max_single_insert_len" => 1,
          "max_single_delete_len" => 1,
          "window_start_offset_ms" => i * 10_000,
          "window_end_offset_ms" => (i + 1) * 10_000,
          "final_text_length" => 200 + chars_per * (i + 1)
        },
        %{id: i + 1, window_start_offset_ms: i * 10_000, window_end_offset_ms: (i + 1) * 10_000}
      )
    end)
  end

  @doc "Aggregated stats matching the AI-extension injection pattern (chars >> keys)."
  def ai_injection_batch(opts \\ []) do
    chars = Keyword.get(opts, :chars, 15)

    batch(%{
      "event_count" => 3,
      "key_event_count" => 1,
      "printable_key_count" => 0,
      "chars_inserted" => chars,
      "chars_deleted" => Keyword.get(opts, :chars_deleted, 29),
      "content_change_count" => 2,
      "multi_char_insert_count" => 1,
      "multi_char_delete_count" => 2,
      "max_single_insert_len" => chars,
      "max_single_delete_len" => 15,
      "paste_shortcut_attempt_count" => 0,
      "paste_blocked_count" => 0,
      "copy_shortcut_count" => 0
    })
  end

  @doc "Self-paste pattern: same chars/keys gap, but the user actually pressed Cmd+V."
  def self_paste_batch(chars \\ 30) do
    batch(%{
      "event_count" => 6,
      "key_event_count" => 4,
      "printable_key_count" => 0,
      "chars_inserted" => chars,
      "chars_deleted" => 0,
      "content_change_count" => 1,
      "multi_char_insert_count" => 1,
      "max_single_insert_len" => chars,
      "paste_shortcut_attempt_count" => 1,
      "copy_shortcut_count" => 1,
      "paste_blocked_count" => 0
    })
  end

  @doc "Pure programmatic edit: zero keydowns of any kind."
  def fully_programmatic_batch do
    batch(%{
      "event_count" => 1,
      "key_event_count" => 0,
      "printable_key_count" => 0,
      "chars_inserted" => 50,
      "content_change_count" => 1,
      "multi_char_insert_count" => 1,
      "max_single_insert_len" => 50
    })
  end

  @doc "Produces a multiline GPT-style code blob."
  def gpt_style_code do
    """
    /**
     * Returns the sum of two numbers.
     *
     * Time complexity: O(1) — constant.
     * Space complexity: O(1).
     *
     * This approach simply uses the built-in addition operator.
     * Edge case: handles negative numbers correctly.
     */
    const solution = (a, b) => {
      // First, we validate the inputs.
      if (typeof a !== 'number' || typeof b !== 'number') {
        // Note that we throw a TypeError to be explicit.
        throw new TypeError('a and b must be numbers');
      }
      // Then we return the sum.
      return a + b;
    };

    module.exports = solution;
    """
  end

  @doc "GPT-style code in Russian."
  def russian_gpt_style_code do
    """
    /**
     * Вот решение задачи.
     *
     * Временная сложность: O(n)
     * Пространственная сложность: O(1)
     *
     * Этот подход использует один проход по массиву.
     * Обратите внимание, что мы проверяем граничные случаи.
     */
    const solution = (arr) => {
      // Данная функция возвращает сумму элементов
      let sum = 0;
      // Например, для [1,2,3] вернет 6
      for (const x of arr) sum += x;
      return sum;
    };

    module.exports = solution;
    """
  end

  @doc "A clean, human-written solution with maybe one short comment."
  def human_style_code do
    """
    const solution = (a, b) => {
      // sum
      let ans = 0;
      for (let i = 0; i < a; i++) ans += b;
      return ans;
    };

    module.exports = solution;
    """
  end
end
