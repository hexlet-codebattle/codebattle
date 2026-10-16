defmodule Codebattle.Repo.Migrations.AddEditorHistoryToGameBotDetectionReports do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:game_bot_detection_reports) do
      add(:editor_history, :map, default: %{}, null: false)
    end
  end
end
