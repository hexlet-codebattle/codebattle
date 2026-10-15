defmodule Codebattle.Repo.Migrations.ReworkGameEditorEventBatchesForSummaries do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:game_editor_event_batches) do
      add(:window_start_offset_ms, :integer)
      add(:window_end_offset_ms, :integer)
      add(:summary, :map)
      remove(:events)
    end
  end
end
