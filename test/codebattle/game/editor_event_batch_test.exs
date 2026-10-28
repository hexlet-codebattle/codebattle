defmodule Codebattle.Game.EditorEventBatchTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Game.EditorEventBatch

  test "retrying a sequence is idempotent; a new collector session remains distinct" do
    user = insert(:user)
    game = insert(:game)

    attrs = %{
      user_id: user.id,
      game_id: game.id,
      lang: "js",
      event_count: 1,
      window_start_offset_ms: 0,
      window_end_offset_ms: 100,
      batch_started_at: ~U[2026-10-28 00:00:00.000000Z],
      batch_ended_at: ~U[2026-10-28 00:00:00.100000Z],
      summary: %{"collector_session" => "session-one", "batch_sequence" => 0}
    }

    assert {:ok, _} = EditorEventBatch.create(attrs)
    assert {:ok, _} = EditorEventBatch.create(attrs)
    assert length(EditorEventBatch.list_by_game(game.id)) == 1

    assert {:ok, _} =
             EditorEventBatch.create(%{attrs | summary: %{"collector_session" => "session-two", "batch_sequence" => 0}})

    assert length(EditorEventBatch.list_by_game(game.id)) == 2
    # Legacy batches have no stable identity; never silently deduplicate them.
    assert {:ok, _} = EditorEventBatch.create(%{attrs | summary: %{"event_count" => 1}})
    assert {:ok, _} = EditorEventBatch.create(%{attrs | summary: %{"event_count" => 1}})
    assert length(EditorEventBatch.list_by_game(game.id)) == 4
  end
end
