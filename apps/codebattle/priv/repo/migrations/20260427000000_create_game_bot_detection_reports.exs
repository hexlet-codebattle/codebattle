defmodule Codebattle.Repo.Migrations.CreateGameBotDetectionReports do
  @moduledoc false
  use Ecto.Migration

  def change do
    create table(:game_bot_detection_reports) do
      add(:game_id, references(:games, on_delete: :delete_all), null: false)
      add(:user_id, references(:users, on_delete: :delete_all), null: false)
      add(:score, :integer, null: false, default: 0)
      add(:level, :string, null: false, default: "none")
      add(:signals, {:array, :string}, null: false, default: [])
      add(:stats, :map, null: false, default: %{})
      add(:code_analysis, :map, null: false, default: %{})
      add(:final_length, :integer, null: false, default: 0)
      add(:template_length, :integer, null: false, default: 0)
      add(:effective_added_length, :integer, null: false, default: 0)
      add(:version, :integer, null: false, default: 1)

      timestamps()
    end

    create(unique_index(:game_bot_detection_reports, [:game_id, :user_id]))
    create(index(:game_bot_detection_reports, [:level]))
    create(index(:game_bot_detection_reports, [:score]))
  end
end
