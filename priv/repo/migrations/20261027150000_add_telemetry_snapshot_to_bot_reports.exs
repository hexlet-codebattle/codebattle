defmodule Codebattle.Repo.Migrations.AddTelemetrySnapshotToBotReports do
  @moduledoc false
  use Ecto.Migration

  def change do
    alter table(:game_bot_detection_reports) do
      add(:telemetry_snapshot, :map, null: false, default: %{})
    end
  end
end
